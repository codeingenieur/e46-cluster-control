"""Client fuer die ESP32-Firmware (Zeilenprotokoll ueber USB-Serial, siehe docs/protocol.md)."""
from __future__ import annotations

import queue
import threading
import time
from typing import Callable, Dict, Optional, Protocol

DEFAULT_BAUD = 921600

GAUGES = ("rpm", "speed", "coolant", "oil", "fco")
FLAGS = ("ign", "mil", "cruise", "eml", "overheat", "oilwarn", "battery", "oilpress")
CONFIG_KEYS = ("rpm_scale", "temp_offset", "speed_hz", "speed_can", "wdt")

# Antworten, auf die ein Kommando wartet. Alles andere (RX, EVT, READY) sind asynchrone Meldungen.
_REPLY_PREFIXES = ("OK", "ERR", "PONG", "STATE", "CFG", "HELP")


class ClusterError(Exception):
    pass


class Transport(Protocol):
    def write(self, data: bytes) -> None: ...
    def readline(self) -> bytes: ...  # b"" bei Timeout
    def close(self) -> None: ...


class SerialTransport:
    def __init__(self, port: str, baud: int = DEFAULT_BAUD):
        import serial  # erst hier, damit der Rest ohne pyserial importier-/testbar bleibt

        # DTR/RTS vor dem Oeffnen aus, sonst resettet die Auto-Reset-Schaltung viele ESP32-Boards.
        self._ser = serial.Serial()
        self._ser.port = port
        self._ser.baudrate = baud
        self._ser.timeout = 0.1
        self._ser.dtr = False
        self._ser.rts = False
        self._ser.open()

    def write(self, data: bytes) -> None:
        self._ser.write(data)

    def readline(self) -> bytes:
        return self._ser.readline()

    def close(self) -> None:
        self._ser.close()


def find_port() -> str:
    """Einzigen ESP32-/USB-UART-Port finden (CP210x, CH340, FTDI, Espressif)."""
    from serial.tools import list_ports

    known_vids = {0x10C4, 0x1A86, 0x0403, 0x303A}
    ports = [p for p in list_ports.comports() if p.vid in known_vids]
    if len(ports) == 1:
        return ports[0].device
    if not ports:
        raise ClusterError("Kein ESP32-Port gefunden; --port angeben (siehe 'ports').")
    raise ClusterError("Mehrere Ports gefunden, bitte --port angeben: " + ", ".join(p.device for p in ports))


def _fmt(value) -> str:
    if isinstance(value, bool):
        return "1" if value else "0"
    return repr(float(value)) if not isinstance(value, int) else str(value)


class Cluster:
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
        self._t = transport
        self._timeout = timeout
        self.on_event = on_event
        self._replies: "queue.Queue[str]" = queue.Queue()
        self._lock = threading.Lock()
        self._stop = threading.Event()
        self._reader = threading.Thread(target=self._read_loop, name="cluster-reader", daemon=True)
        self._reader.start()
        self._handshake()

    # ------------------------------------------------------------------ Verbindung

    def _read_loop(self) -> None:
        while not self._stop.is_set():
            try:
                raw = self._t.readline()
            except Exception as exc:  # Port weg o.ae.
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
        # Nach dem Oeffnen kann der ESP noch booten: mehrfach pingen.
        for _ in range(tries):
            try:
                self.ping()
                return
            except ClusterError:
                time.sleep(0.3)
        raise ClusterError("Keine Antwort auf PING; Firmware geflasht und richtiger Port/Baudrate?")

    def close(self) -> None:
        self._stop.set()
        self._t.close()

    def __enter__(self) -> "Cluster":
        return self

    def __exit__(self, *exc) -> None:
        self.close()

    # ------------------------------------------------------------------ Kommandos

    def _send(self, line: str, wait: bool = True) -> str:
        with self._lock:
            while not self._replies.empty():  # veraltete Antworten verwerfen
                self._replies.get_nowait()
            self._t.write((line + "\n").encode("ascii"))
            if not wait:
                return ""
            try:
                reply = self._replies.get(timeout=self._timeout)
            except queue.Empty:
                raise ClusterError(f"Timeout bei '{line}'") from None
        if reply.startswith("ERR"):
            raise ClusterError(f"'{line}' -> {reply}")
        return reply

    def ping(self) -> str:
        return self._send("PING")

    def set(self, wait: bool = True, **values) -> None:
        """Werte setzen, z.B. set(rpm=3000, speed=80, mil=True). Eine Zeile wirkt ganz oder gar nicht."""
        if not values:
            return
        unknown = set(values) - set(GAUGES) - set(FLAGS)
        if unknown:
            raise ValueError(f"Unbekannte Signale: {sorted(unknown)}")
        pairs = " ".join(f"{k} {_fmt(v)}" for k, v in values.items())
        self._send("SET " + pairs, wait)

    def zero(self) -> None:
        self._send("ZERO")

    def state(self) -> Dict[str, str]:
        return _parse_kv(self._send("GET"), "STATE")

    def config(self, **values) -> Dict[str, str]:
        """Konfiguration lesen (ohne Argumente) oder setzen, z.B. config(rpm_scale=6.4)."""
        unknown = set(values) - set(CONFIG_KEYS)
        if unknown:
            raise ValueError(f"Unbekannte Config-Keys: {sorted(unknown)}")
        if values:
            self._send("CFG " + " ".join(f"{k} {_fmt(v)}" for k, v in values.items()))
        return _parse_kv(self._send("CFG"), "CFG")

    def tx_enable(self, on: bool) -> None:
        self._send(f"TX {int(on)}")

    def watchdog(self, ms: int) -> None:
        """Firmware nullt RPM/Speed, wenn laenger als ms kein Kommando kam (0 = aus)."""
        self.config(wdt=ms)

    def raw(self, can_id: int, data: bytes) -> None:
        """Einen Frame einmalig senden (11-Bit-ID, bis 8 Byte)."""
        self._send(f"RAW {can_id:X} {_hex(data)}")

    def cyclic(self, slot: int, can_id: int, period_ms: int, data: bytes) -> None:
        """Eigenen Frame zyklisch senden (Slot 0-3), z.B. zum Ausprobieren unbekannter Signale."""
        self._send(f"CYC {slot} {can_id:X} {period_ms} {_hex(data)}")

    def cyclic_off(self, slot: int) -> None:
        self._send(f"CYC {slot} OFF")

    def sniff(self, on: bool) -> None:
        """Empfangene CAN-Frames als 'RX <id> <hex>' an on_event melden."""
        self._send(f"SNIFF {int(on)}")


def _hex(data: bytes) -> str:
    if len(data) > 8:
        raise ValueError("Maximal 8 Datenbytes")
    return data.hex().upper()


def _parse_kv(line: str, prefix: str) -> Dict[str, str]:
    if not line.startswith(prefix):
        raise ClusterError(f"Unerwartete Antwort: {line}")
    return dict(item.split("=", 1) for item in line.split()[1:] if "=" in item)
