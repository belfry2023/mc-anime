#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""移除 level.dat 中指向已卸载模组的数据包引用（避免「选中的数据包出现错误，世界无法加载」）。

用法（在 game/.minecraft 目录下）:
    python tools/fix_level_dat_packs.py [世界目录名...]
不传参数则处理 saves 下全部世界。

只会从 DataPacks.Enabled / DataPacks.Disabled 里删掉名字包含
REMOVE_MATCH 子串的条目，其余 NBT 原样保留；改动前自动备份 level.dat.bak。
"""
import gzip
import os
import shutil
import struct
import sys
import time

REMOVE_MATCH = ("the_obsessed", "themanfromthefog", "anomaly")


# ---------------- 最小 NBT 读取/写入 ----------------
def _u1(b, i):
    return b[i], i + 1


def _i1(b, i):
    return struct.unpack(">b", b[i:i + 1])[0], i + 1


def _i2(b, i):
    return struct.unpack(">h", b[i:i + 2])[0], i + 2


def _u2(b, i):
    return struct.unpack(">H", b[i:i + 2])[0], i + 2


def _i4(b, i):
    return struct.unpack(">i", b[i:i + 4])[0], i + 4


def _i8(b, i):
    return struct.unpack(">q", b[i:i + 8])[0], i + 8


def _f4(b, i):
    return struct.unpack(">f", b[i:i + 4])[0], i + 4


def _f8(b, i):
    return struct.unpack(">d", b[i:i + 8])[0], i + 8


def _rstr(b, i):
    n, i = _u2(b, i)
    return b[i:i + n].decode("utf-8", "surrogateescape"), i + n


def _read_payload(b, i, t):
    if t == 1:
        return _i1(b, i)
    if t == 2:
        return _i2(b, i)
    if t == 3:
        return _i4(b, i)
    if t == 4:
        return _i8(b, i)
    if t == 5:
        return _f4(b, i)
    if t == 6:
        return _f8(b, i)
    if t == 7:
        n, i = _i4(b, i)
        return b[i:i + n], i + n
    if t == 8:
        return _rstr(b, i)
    if t == 9:
        et, i = _u1(b, i)
        n, i = _i4(b, i)
        items = []
        for _ in range(n):
            v, i = _read_payload(b, i, et)
            items.append(v)
        return ("list", et, items), i
    if t == 10:
        d = {}
        while True:
            tt, i = _u1(b, i)
            if tt == 0:
                break
            name, i = _rstr(b, i)
            v, i = _read_payload(b, i, tt)
            d[name] = (tt, v)
        return d, i
    if t == 11:
        n, i = _i4(b, i)
        vals = list(struct.unpack(">%di" % n, b[i:i + 4 * n])) if n else []
        return vals, i + 4 * n
    if t == 12:
        n, i = _i4(b, i)
        vals = list(struct.unpack(">%dq" % n, b[i:i + 8 * n])) if n else []
        return vals, i + 8 * n
    raise ValueError("未知 NBT tag: %d" % t)


def _wstr(s):
    data = s.encode("utf-8", "surrogateescape")
    return struct.pack(">H", len(data)) + data


def _write_payload(t, v):
    if t == 1:
        return struct.pack(">b", v)
    if t == 2:
        return struct.pack(">h", v)
    if t == 3:
        return struct.pack(">i", v)
    if t == 4:
        return struct.pack(">q", v)
    if t == 5:
        return struct.pack(">f", v)
    if t == 6:
        return struct.pack(">d", v)
    if t == 7:
        return struct.pack(">i", len(v)) + v
    if t == 8:
        return _wstr(v)
    if t == 9:
        _, et, items = v
        out = struct.pack(">bi", et, len(items))
        for it in items:
            out += _write_payload(et, it)
        return out
    if t == 10:
        out = b""
        for name, (tt, vv) in v.items():
            out += struct.pack(">b", tt) + _wstr(name) + _write_payload(tt, vv)
        return out + b"\x00"
    if t == 11:
        return struct.pack(">i", len(v)) + b"".join(struct.pack(">i", x) for x in v)
    if t == 12:
        return struct.pack(">i", len(v)) + b"".join(struct.pack(">q", x) for x in v)
    raise ValueError("未知 NBT tag: %d" % t)


def load_level_dat(path):
    with gzip.open(path, "rb") as f:
        raw = f.read()
    t, i = _u1(raw, 0)
    name, i = _rstr(raw, i)
    payload, i = _read_payload(raw, i, t)
    return t, name, payload


def save_level_dat(path, t, name, payload):
    raw = struct.pack(">b", t) + _wstr(name) + _write_payload(t, payload)
    with gzip.open(path, "wb") as f:
        f.write(raw)


def patch_world(world_dir, dry_run=False):
    level = os.path.join(world_dir, "level.dat")
    if not os.path.exists(level):
        return None
    root = load_level_dat(level)
    t, name, payload = root
    # 1.20 的 level.dat 结构是 root -> Data -> DataPacks
    holder = payload
    if "Data" in payload and payload["Data"][0] == 10:
        holder = payload["Data"][1]
        datapacks_holder = holder
    else:
        datapacks_holder = payload
    if "DataPacks" not in datapacks_holder:
        return (world_dir, "no DataPacks", [], [])
    dp_t, dp = datapacks_holder["DataPacks"]
    changed_enabled, changed_disabled = [], []
    for field, acc in (("Enabled", changed_enabled), ("Disabled", changed_disabled)):
        if field not in dp:
            continue
        lt, (lst, et, items) = dp[field]
        if et != 8:
            continue
        kept = []
        for s in items:
            low = s.lower()
            if any(m in low for m in REMOVE_MATCH):
                acc.append(s)
            else:
                kept.append(s)
        dp[field] = (lt, ("list", 8, kept))
    if not changed_enabled and not changed_disabled:
        return (world_dir, "无需修改", [], [])
    if not dry_run:
        backup = level + ".bak-" + time.strftime("%Y%m%d-%H%M%S")
        shutil.copy2(level, backup)
        save_level_dat(level, t, name, payload)
    return (world_dir, "已修改", changed_enabled, changed_disabled)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    base = os.path.join(repo_root, "game", ".minecraft")
    if not os.path.isdir(os.path.join(base, "saves")):
        base = os.getcwd()
    saves = os.path.join(base, "saves")
    worlds = [os.path.join(saves, a) for a in args] if args else [
        os.path.join(saves, d) for d in sorted(os.listdir(saves))
        if os.path.isdir(os.path.join(saves, d))
    ]
    for w in worlds:
        try:
            res = patch_world(w)
        except Exception as e:  # noqa
            print("[ERR] %s -> %s" % (w, e))
            continue
        if res is None:
            continue
        path, status, en, dis = res
        print("%-28s %-8s enabled移除=%s disabled移除=%s" % (
            os.path.basename(path), status, en, dis))


if __name__ == "__main__":
    main()
