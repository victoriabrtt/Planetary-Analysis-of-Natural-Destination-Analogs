"""Lector mínimo de dBase III (.dbf), suficiente para los shapefiles de nomenclatura de la USGS/IAU."""

from __future__ import annotations

import struct
from pathlib import Path


def read_dbf(path: Path, encoding: str = "utf-8") -> list[dict]:
    data = Path(path).read_bytes()
    n_rec, hdr_len, rec_len = struct.unpack("<IHH", data[4:12])
    fields, off = [], 32
    while data[off] != 0x0D:
        name = data[off : off + 11].split(b"\0")[0].decode("ascii")
        ftype, flen = chr(data[off + 11]), data[off + 16]
        fields.append((name, ftype, flen))
        off += 32
    rows = []
    for i in range(n_rec):
        rec = data[hdr_len + i * rec_len : hdr_len + (i + 1) * rec_len]
        if rec[:1] == b"*":  # borrado
            continue
        pos, row = 1, {}
        for name, ftype, flen in fields:
            raw = rec[pos : pos + flen].decode(encoding, errors="replace").strip()
            pos += flen
            if ftype in "NF":
                try:
                    row[name] = float(raw) if raw else None
                except ValueError:
                    row[name] = None
            else:
                row[name] = raw
        rows.append(row)
    return rows
