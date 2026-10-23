"""Kommandozeile: python -m e46cluster <befehl>"""
from __future__ import annotations

import argparse
import math
import sys
import time

from .client import CONFIG_KEYS, DEFAULT_BAUD, FLAGS, GAUGES, Cluster, ClusterError


def _parse_assignments(items, allowed):
    values = {}
    for item in items:
        key, sep, raw = item.partition("=")
        if not sep or key not in allowed:
            raise SystemExit(f"Ungueltig: '{item}' (erlaubt: {', '.join(allowed)}; Format key=wert)")
        try:
            values[key] = float(raw)
        except ValueError:
            raise SystemExit(f"Kein Zahlenwert: '{item}'") from None
    return values


def _cmd_ports(args) -> None:
    from serial.tools import list_ports

    for p in list_ports.comports():
        vid = f"{p.vid:04X}:{p.pid:04X}" if p.vid is not None else "----:----"
        print(f"{p.device}\t{vid}\t{p.description}")


def _cmd_ping(args, cl: Cluster) -> None:
    print(cl.ping())


def _cmd_set(args, cl: Cluster) -> None:
    cl.set(**_parse_assignments(args.values, GAUGES + FLAGS))


def _cmd_get(args, cl: Cluster) -> None:
    for k, v in cl.state().items():
        print(f"{k:10} {v}")


def _cmd_cfg(args, cl: Cluster) -> None:
    for k, v in cl.config(**_parse_assignments(args.values, CONFIG_KEYS)).items():
        print(f"{k:12} {v}")


def _cmd_raw(args, cl: Cluster) -> None:
    cl.raw(int(args.id, 16), bytes.fromhex("".join(args.data)))


def _cmd_sniff(args, cl: Cluster) -> None:
    cl.on_event = lambda line: print(line, flush=True)
    cl.sniff(True)
    try:
        while True:
            time.sleep(0.5)
    except KeyboardInterrupt:
        cl.sniff(False)


def _cmd_sweep(args, cl: Cluster) -> None:
    """Demo: alle Zeiger weich hoch und runter fahren."""
    period = args.seconds
    t0 = time.monotonic()
    try:
        while True:
            phase = (time.monotonic() - t0) / period * 2 * math.pi
            k = 0.5 - 0.5 * math.cos(phase)  # 0 -> 1 -> 0
            cl.set(rpm=k * 7000, speed=k * 240, coolant=60 + k * 50, oil=60 + k * 60)
            time.sleep(0.02)
    except KeyboardInterrupt:
        cl.zero()


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(prog="e46cluster", description=__doc__)
    ap.add_argument("--port", help="z.B. COM5; ohne Angabe wird ein ESP32-Port gesucht")
    ap.add_argument("--baud", type=int, default=DEFAULT_BAUD)
    sub = ap.add_subparsers(dest="cmd", required=True)

    sub.add_parser("ports", help="serielle Ports auflisten")
    sub.add_parser("ping", help="Firmware anpingen")
    p = sub.add_parser("set", help="Werte setzen: set rpm=3000 speed=80 mil=1")
    p.add_argument("values", nargs="+")
    sub.add_parser("get", help="aktuellen Zustand und CAN-Zaehler anzeigen")
    p = sub.add_parser("cfg", help="Konfiguration lesen/setzen: cfg rpm_scale=6.4")
    p.add_argument("values", nargs="*")
    p = sub.add_parser("raw", help="einen CAN-Frame senden: raw 316 0500 0000 0000")
    p.add_argument("id", help="Hex-ID")
    p.add_argument("data", nargs="*", help="Hex-Bytes")
    sub.add_parser("sniff", help="empfangene CAN-Frames ausgeben (Strg+C beendet)")
    p = sub.add_parser("sweep", help="Demo: Zeiger auf und ab fahren (Strg+C beendet)")
    p.add_argument("--seconds", type=float, default=6.0, help="Dauer eines Hin-und-zurueck")

    args = ap.parse_args(argv)
    if args.cmd == "ports":
        _cmd_ports(args)
        return 0

    handlers = {
        "ping": _cmd_ping, "set": _cmd_set, "get": _cmd_get, "cfg": _cmd_cfg,
        "raw": _cmd_raw, "sniff": _cmd_sniff, "sweep": _cmd_sweep,
    }
    try:
        with Cluster(port=args.port, baud=args.baud) as cl:
            handlers[args.cmd](args, cl)
    except ClusterError as exc:
        print(f"Fehler: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
