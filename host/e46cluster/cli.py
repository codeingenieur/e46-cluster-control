"""Command line: python -m e46cluster <command>"""
from __future__ import annotations

import argparse
import math
import sys
import time

from .client import CONFIG_KEYS, DEFAULT_BAUD, FLAGS, GAUGES, Cluster, ClusterError


def _parse_assignments(items, allowed):
    """Turn ['rpm=3000', 'mil=1'] into {'rpm': 3000.0, 'mil': 1.0}; exit with a message on bad input."""
    values = {}
    for item in items:
        key, separator, raw_value = item.partition("=")
        if not separator or key not in allowed:
            raise SystemExit(f"Invalid: '{item}' (allowed: {', '.join(allowed)}; format key=value)")
        try:
            values[key] = float(raw_value)
        except ValueError:
            raise SystemExit(f"Not a number: '{item}'") from None
    return values


def _cmd_ports(args) -> None:
    from serial.tools import list_ports

    for port in list_ports.comports():
        usb_id = f"{port.vid:04X}:{port.pid:04X}" if port.vid is not None else "----:----"
        print(f"{port.device}\t{usb_id}\t{port.description}")


def _cmd_ping(args, cluster: Cluster) -> None:
    print(cluster.ping())


def _cmd_set(args, cluster: Cluster) -> None:
    cluster.set(**_parse_assignments(args.values, GAUGES + FLAGS))


def _cmd_get(args, cluster: Cluster) -> None:
    for key, value in cluster.state().items():
        print(f"{key:10} {value}")


def _cmd_zero(args, cluster: Cluster) -> None:
    cluster.zero()


def _cmd_cfg(args, cluster: Cluster) -> None:
    for key, value in cluster.config(**_parse_assignments(args.values, CONFIG_KEYS)).items():
        print(f"{key:12} {value}")


def _cmd_raw(args, cluster: Cluster) -> None:
    cluster.raw(int(args.id, 16), bytes.fromhex("".join(args.data)))


def _cmd_sniff(args, cluster: Cluster) -> None:
    cluster.on_event = lambda line: print(line, flush=True)
    cluster.sniff(True)
    try:
        while True:
            time.sleep(0.5)
    except KeyboardInterrupt:
        cluster.sniff(False)


def _cmd_sweep(args, cluster: Cluster) -> None:
    """Demo: move all needles smoothly up and down."""
    period_seconds = args.seconds
    start = time.monotonic()
    try:
        while True:
            phase = (time.monotonic() - start) / period_seconds * 2 * math.pi
            position = 0.5 - 0.5 * math.cos(phase)  # 0 -> 1 -> 0
            cluster.set(rpm=position * 7000, speed=position * 240, coolant=60 + position * 50, oil=60 + position * 60)
            time.sleep(0.02)
    except KeyboardInterrupt:
        cluster.zero()


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(prog="e46cluster", description=__doc__)
    parser.add_argument("--port", help="for example COM5; without it a single ESP32 or Arduino port is searched for")
    parser.add_argument("--baud", type=int, default=DEFAULT_BAUD)
    commands = parser.add_subparsers(dest="cmd", required=True)

    commands.add_parser("ports", help="list serial ports")
    commands.add_parser("ping", help="ping the firmware")
    sub = commands.add_parser("set", help="set values: set rpm=3000 speed=80 mil=1")
    sub.add_argument("values", nargs="+")
    commands.add_parser("get", help="show the current state and the CAN counters")
    commands.add_parser("zero", help="set rpm and speed to 0")
    sub = commands.add_parser("cfg", help="read or change calibration values: cfg rpm_scale=6.4")
    sub.add_argument("values", nargs="*")
    sub = commands.add_parser("raw", help="send one CAN frame: raw 316 0500 0000 0000")
    sub.add_argument("id", help="CAN id in hex")
    sub.add_argument("data", nargs="*", help="data bytes in hex")
    commands.add_parser("sniff", help="print received CAN frames (Ctrl+C stops)")
    sub = commands.add_parser("sweep", help="demo: move the needles up and down (Ctrl+C stops)")
    sub.add_argument("--seconds", type=float, default=6.0, help="duration of one up-and-down cycle")

    args = parser.parse_args(argv)
    if args.cmd == "ports":
        _cmd_ports(args)
        return 0

    handlers = {
        "ping": _cmd_ping, "set": _cmd_set, "get": _cmd_get, "zero": _cmd_zero, "cfg": _cmd_cfg,
        "raw": _cmd_raw, "sniff": _cmd_sniff, "sweep": _cmd_sweep,
    }
    try:
        with Cluster(port=args.port, baud=args.baud) as cluster:
            handlers[args.cmd](args, cluster)
    except ClusterError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
