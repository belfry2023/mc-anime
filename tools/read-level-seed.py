import gzip, struct, sys

path = r"dist\mc-anime-server\world\level.dat"
data = gzip.open(path, "rb").read()
i = 0
def rd(fmt, n):
    global i
    v = struct.unpack_from(fmt, data, i)[0]
    i += n
    return v
def rdstr():
    global i
    ln = rd(">H", 2)
    s = data[i:i+ln].decode("utf-8", "replace")
    i += ln
    return s

tag = rd(">B", 1); name = rdstr()
assert tag == 10
seed = None
def walk(depth):
    global i, seed
    while True:
        t = rd(">B", 1)
        if t == 0:
            return
        nm = rdstr()
        if t == 4:
            v = rd(">q", 8)
            if nm == "seed":
                seed = v
        elif t == 3:
            rd(">i", 4)
        elif t == 1:
            rd(">b", 1)
        elif t == 2:
            rd(">h", 2)
        elif t == 5:
            rd(">f", 4)
        elif t == 6:
            rd(">d", 8)
        elif t == 8:
            ln = rd(">H", 2); i += ln
        elif t == 9:
            et = rd(">B", 1); ln = rd(">i", 4)
            for _ in range(ln):
                if et == 10: walk(depth+1)
                elif et == 8: rd(">H", 2); ln2 = struct.unpack_from(">H", data, i-2)[0]; i += ln2
                elif et == 4: rd(">q", 8)
                elif et == 3: rd(">i", 4)
                elif et == 1: rd(">b", 1)
                elif et == 2: rd(">h", 2)
                elif et == 5: rd(">f", 4)
                elif et == 6: rd(">d", 8)
                else: raise SystemExit("unsupported list elem %d" % et)
        elif t == 10:
            walk(depth+1)
        elif t == 11:
            ln = rd(">i", 4); i += ln*4
        elif t == 12:
            ln = rd(">i", 4); i += ln*8
        else:
            raise SystemExit("unsupported tag %d (%s)" % (t, nm))
walk(0)
print("seed in level.dat =", seed)
print("matches target  =", seed == 4477012745288185 or seed == 4477012745885288185)
