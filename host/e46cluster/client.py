"""Client for the cluster firmware (line protocol over USB serial, see docs/protocol.md).

It works with both firmwares: the ESP32/CAN one for E46 clusters and the Arduino Uno one for the
E36 cluster. Each firmware only accepts its own keys and answers "ERR unknown_key" to the others.
"""
from __future__ import annotations

import queue
import threading
import time
from typing import Callable, Dict, Optional, Protocol

DEFAULT_BAUD = 115200

# Which keys are valid depends on the firmware: ESP32/CAN (E46) or Uno (E36 cluster, docs/e36-uno.md).
GAUGES = ("rpm", "speed", "coolant", "oil", "fco", "fuel", "coolant_pwm", "fuel_pwm")
FLAGS = (
    "ign", "mil", "cruise", "eml", "overheat", "oilwarn", "battery", "oilpress",  # ESP32/CAN
    "handbrake", "abs", "asc", "airbag", "brakefluid", "left", "right", "highbeam",  # Uno/E36
    "fogfront", "fogrear", "belt", "cat",
)
CONFIG_KEYS = (
    "rpm_scale", "temp_offset", "speed_hz", "speed_can", "wdt",  # ESP32/CAN
    "rpm_ppr", "rpm_idle", "speed_idle", "cool_c0", "cool_c1", "cool_d0", "cool_d1", "fuel_d0", "fuel_d1",  # Uno/E36
    "rpm_c1", "rpm_c2", "rpm_c3", "rpm_c4", "rpm_c5", "rpm_c6", "rpm_c7",  # Uno/E36: needle correction at 1000..6000 and 6500 rpm
)

# A command waits for a line that starts with one of these. Every other line (RX, EVT, READY) is an
# asynchronous message and goes to the on_event callback.
_REPLY_PREFIXES = ("OK", "ERR", "PONG", "STATE", "CFG", "HELP")


class ClusterError(Exception):
    """The firmware reported an error, did not answer in time, or no port was found."""


class Transport(Protocol):
    """What the Cluster class needs from a connection. Tests use a fake one instead of a serial port."""

    def write(self, data: bytes) -> None: ...
    def readline(self) -> bytes: ...  # returns b"" on timeout
    def close(self) -> None: ...


class SerialTransport:
    def __init__(self, port: str, baud: int = DEFAULT_BAUD):
        import serial  # imported here so the rest can be imported and tested without pyserial

        # Keep DTR and RTS off before opening: on many ESP32 boards they trigger the auto-reset circuit.
        # (An Arduino Uno resets whenever the port is opened anyway.)
        self._serial = serial.Serial()
        self._serial.port = port
        self._serial.baudrate = baud
        self._serial.timeout = 0.1
        self._serial.dtr = False
        self._serial.rts = False
        self._serial.open()

    def write(self, data: bytes) -> None:
        self._serial.write(data)

    def readline(self) -> bytes:
        return self._serial.readline()

    def close(self) -> None:
        self._serial.close()


def find_port() -> str:
    """Find the single ESP32, Arduino or USB-UART port (CP210x, CH340, FTDI, Espressif, Arduino)."""
    from serial.tools import list_ports

    known_vendor_ids = {0x10C4, 0x1A86, 0x0403, 0x303A, 0x2341, 0x2A03}  # 2341 and 2A03 are Arduino
    ports = [p for p in list_ports.comports() if p.vid in known_vendor_ids]
    if len(ports) == 1:
        return ports[0].device
    if not ports:
        raise ClusterError("No ESP32 or Arduino port found; pass --port (see the 'ports' command).")
    raise ClusterError("Several ports found, please pass --port: " + ", ".join(p.device for p in ports))


def _format_value(value) -> str:
    """Format a number the way the firmware expects it (bool as 1/0, int without decimals)."""
    if isinstance(value, bool):
        return "1" if value else "0"
    return repr(float(value)) if not isinstance(value, int) else str(value)


class Cluster:
    """A connection to the firmware. Use it as a context manager: with Cluster() as cl: cl.set(rpm=3000)."""

    def __init__(
        self,
        port: Optional[str] = None,
        baud: int = DEFAULT_BAUD,
        transport: Optional[Transport] = None,
        timeout: float = 1.0,
        on_event: Optional[Callable[[str], None]] = None,
    ):
        if transport is None:
            transport = SerialTransport(port or find_port(), baud)
        self._transport = transport
        self._timeout = timeout
        self.on_event = on_event
        self._replies: "queue.Queue[str]" = queue.Queue()
        self._send_lock = threading.Lock()
        self._stop_reading = threading.Event()
        self._reader = threading.Thread(target=self._read_loop, name="cluster-reader", daemon=True)
        self._reader.start()
        self._handshake()

    # ------------------------------------------------------------------ Connection

    def _read_loop(self) -> None:
        """Runs in a background thread: sort incoming lines into replies and asynchronous events."""
        while not self._stop_reading.is_set():
            try:
                raw = self._transport.readline()
            except Exception as exc:  # port unplugged or similar
                self._replies.put("ERR transport " + str(exc))
                return
            line = raw.decode("ascii", errors="replace").strip()
            if not line:
                continue
            if line.startswith(_REPLY_PREFIXES):
                self._replies.put(line)
            elif self.on_event:
                self.on_event(line)

    def _handshake(self, tries: int = 6) -> None:
        # Right after opening the port the board may still be booting, so ping several times.
        for _ in range(tries):
            try:
                self.ping()
                return
            except ClusterError:
                time.sleep(0.3)
        raise ClusterError("No answer to PING; is the firmware flashed, and are the port and baud rate right?")

    def close(self) -> None:
        self._stop_reading.set()
        self._transport.close()

    def __enter__(self) -> "Cluster":
        return self

    def __exit__(self, *exc) -> None:
        self.close()

    # ------------------------------------------------------------------ Commands

    def _send(self, line: str, wait: bool = True) -> str:
        """Send one command line and return the firmware's reply. Raises ClusterError on "ERR ..." or timeout."""
        with self._send_lock:
            while not self._replies.empty():  # throw away stale replies
                self._replies.get_nowait()
            self._transport.write((line + "\n").encode("ascii"))
            if not wait:
                return ""
            try:
                reply = self._replies.get(timeout=self._timeout)
            except queue.Empty:
                raise ClusterError(f"Timeout waiting for the reply to '{line}'") from None
        if reply.startswith("ERR"):
            raise ClusterError(f"'{line}' -> {reply}")
        return reply

    def ping(self) -> str:
        return self._send("PING")

    def set(self, wait: bool = True, **values) -> None:
        """Set values, for example set(rpm=3000, speed=80, mil=True). A call takes effect completely or not at all."""
        if not values:
            return
        unknown = set(values) - set(GAUGES) - set(FLAGS)
        if unknown:
            raise ValueError(f"Unknown signals: {sorted(unknown)}")
        pairs = " ".join(f"{key} {_format_value(value)}" for key, value in values.items())
        self._send("SET " + pairs, wait)

    def zero(self) -> None:
        """Set rpm and speed to 0."""
        self._send("ZERO")

    def state(self) -> Dict[str, str]:
        """Return the firmware's current state as a dict of strings."""
        return _parse_key_values(self._send("GET"), "STATE")

    def config(self, **values) -> Dict[str, str]:
        """Read the calibration values (no arguments) or change them, for example config(rpm_scale=6.4)."""
        unknown = set(values) - set(CONFIG_KEYS)
        if unknown:
            raise ValueError(f"Unknown config keys: {sorted(unknown)}")
        if values:
            self._send("CFG " + " ".join(f"{key} {_format_value(value)}" for key, value in values.items()))
        return _parse_key_values(self._send("CFG"), "CFG")

    def tx_enable(self, on: bool) -> None:
        """Stop or resume the automatic CAN frames (ESP32 only)."""
        self._send(f"TX {int(on)}")

    def watchdog(self, ms: int) -> None:
        """The firmware sets rpm and speed to 0 when no command arrived for this many milliseconds (0 = off)."""
        self.config(wdt=ms)

    def raw(self, can_id: int, data: bytes) -> None:
        """Send one CAN frame once (11-bit id, up to 8 bytes). ESP32 only."""
        self._send(f"RAW {can_id:X} {_to_hex(data)}")

    def cyclic(self, slot: int, can_id: int, period_ms: int, data: bytes) -> None:
        """Send your own CAN frame repeatedly (slot 0 to 3), for example to try unknown signals. ESP32 only."""
        self._send(f"CYC {slot} {can_id:X} {period_ms} {_to_hex(data)}")

    def cyclic_off(self, slot: int) -> None:
        self._send(f"CYC {slot} OFF")

    def sniff(self, on: bool) -> None:
        """Report received CAN frames as 'RX <id> <hex>' to the on_event callback. ESP32 only."""
        self._send(f"SNIFF {int(on)}")


def _to_hex(data: bytes) -> str:
    if len(data) > 8:
        raise ValueError("At most 8 data bytes")
    return data.hex().upper()


def _parse_key_values(line: str, prefix: str) -> Dict[str, str]:
    """Turn 'STATE rpm=3000 speed=80.0' into {'rpm': '3000', 'speed': '80.0'}."""
    if not line.startswith(prefix):
        raise ClusterError(f"Unexpected reply: {line}")
    return dict(item.split("=", 1) for item in line.split()[1:] if "=" in item)
