import queue
import threading
import unittest

from e46cluster.client import Cluster, ClusterError


class FakeFirmware:
    """Minimaler Ersatz fuer die ESP32-Firmware: nimmt Zeilen an, liefert Antworten."""

    def __init__(self):
        self.lines = []
        self._out: "queue.Queue[bytes]" = queue.Queue()
        self.cfg = {"rpm_scale": "6.4000", "wdt": "0"}

    def write(self, data: bytes) -> None:
        line = data.decode().strip()
        self.lines.append(line)
        cmd = line.split()[0]
        if cmd == "PING":
            self.push("PONG e46-cluster 0.1.0")
        elif cmd == "SET" and "bogus" in line:
            self.push("ERR unknown_key")
        elif cmd == "GET":
            self.push("STATE rpm=3000 speed=80.0 can=running")
        elif cmd == "CFG":
            parts = line.split()[1:]
            for k, v in zip(parts[::2], parts[1::2]):
                self.cfg[k] = v
            if parts:
                self.push("OK")
            else:
                self.push("CFG " + " ".join(f"{k}={v}" for k, v in self.cfg.items()))
        elif cmd == "NOREPLY":
            pass
        else:
            self.push("OK")

    def push(self, line: str) -> None:
        self._out.put((line + "\n").encode())

    def readline(self) -> bytes:
        try:
            return self._out.get(timeout=0.05)
        except queue.Empty:
            return b""

    def close(self) -> None:
        pass


class ClusterTest(unittest.TestCase):
    def setUp(self):
        self.fw = FakeFirmware()
        self.events = []
        self.cl = Cluster(transport=self.fw, timeout=0.3, on_event=self.events.append)

    def tearDown(self):
        self.cl.close()

    def test_set_formats_one_line(self):
        self.cl.set(rpm=3000, mil=True, speed=80.5)
        self.assertEqual(self.fw.lines[-1], "SET rpm 3000 mil 1 speed 80.5")

    def test_set_rejects_unknown_signal_client_side(self):
        with self.assertRaises(ValueError):
            self.cl.set(bogus=1)
        self.assertNotIn("SET", " ".join(self.fw.lines))

    def test_firmware_error_raises(self):
        # Client kennt "bogus" nicht, also direkt am Protokoll vorbei senden.
        with self.assertRaises(ClusterError):
            self.cl._send("SET bogus 1")

    def test_state_parsed(self):
        self.assertEqual(self.cl.state(), {"rpm": "3000", "speed": "80.0", "can": "running"})

    def test_config_set_then_read(self):
        cfg = self.cl.config(rpm_scale=6.42)
        self.assertEqual(cfg["rpm_scale"], "6.42")

    def test_raw_and_cyclic_hex(self):
        self.cl.raw(0x316, bytes([5, 0, 0x80, 0x25]))
        self.assertEqual(self.fw.lines[-1], "RAW 316 05008025")
        self.cl.cyclic(1, 0x545, 100, b"\x02\x00")
        self.assertEqual(self.fw.lines[-1], "CYC 1 545 100 0200")
        with self.assertRaises(ValueError):
            self.cl.raw(0x316, bytes(9))

    def test_timeout(self):
        with self.assertRaises(ClusterError):
            self.cl._send("NOREPLY")

    def test_async_lines_go_to_event_callback_not_reply_queue(self):
        self.fw.push("RX 153 0000A0320000FF00")
        self.fw.push("EVT bus_off")
        threading.Event().wait(0.2)
        self.assertEqual(self.events, ["RX 153 0000A0320000FF00", "EVT bus_off"])
        self.cl.ping()  # Antwortkanal bleibt sauber


if __name__ == "__main__":
    unittest.main()
