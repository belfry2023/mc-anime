"""为 mc-anime 的 Forge 1.20.1 实例安装 JennySP 2.7.4 和女仆桥接。"""
import argparse
import hashlib
import re
import shutil
import tempfile
import zipfile
from datetime import datetime
from pathlib import Path
from urllib.request import Request, urlopen

from install_jenny_maid import build_pack

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "game" / ".minecraft"
JAR = "JennySP-forge-1.20.1-2.7.4.jar"
URL = "https://jennysp.biz/releases/" + JAR
SHA256 = "fa469f07403424665d3b44372e5eafbe8ce774847084931097d747a9341b9526"
MODEL = Path("tlm_custom_pack/mc-anime-jenny.zip")


def digest(path):
    value = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def select_instance(explicit):
    root = explicit.expanduser().resolve() if explicit else PACK
    if not root.is_dir():
        raise ValueError("实例目录不存在：" + str(root))
    candidates = []
    compatible = []
    for path in [root] + sorted((root / "versions").glob("*")):
        jars = [re.sub(r"[^a-z0-9]", "", p.name.lower()) for p in (path / "mods").glob("*.jar")]
        if jars:
            candidates.append(path)
            if any("touhoulittlemaid" in name for name in jars) and any("kubejs" in name for name in jars):
                compatible.append(path)
    # Dropping a PCL root should find the pack even if other Minecraft versions are installed alongside it.
    candidates = compatible or candidates
    if explicit and (not candidates or root in candidates):
        return root
    if len(candidates) == 1:
        return candidates[0]
    if not candidates:
        raise ValueError("仓库旁未找到已装模组的实例。请把启动器里的游戏目录拖到安装珍妮.bat，或使用 --instance。")
    raise ValueError("找到多个实例，请用 --instance 选定：\n" + "\n".join(map(str, candidates)))


def is_jenny(path):
    try:
        with zipfile.ZipFile(path) as jar:
            metadata = jar.read("META-INF/mods.toml").decode("utf-8-sig")
            return bool(re.search(r"""(?m)^\s*modId\s*=\s*["']sexmod["']""", metadata))
    except (zipfile.BadZipFile, KeyError, UnicodeDecodeError):
        return False


def same_pack(first, second):
    try:
        with zipfile.ZipFile(first) as a, zipfile.ZipFile(second) as b:
            return {i.filename: (i.CRC, i.file_size) for i in a.infolist()} == {
                i.filename: (i.CRC, i.file_size) for i in b.infolist()} and b.testzip() is None
    except (FileNotFoundError, zipfile.BadZipFile):
        return False


def install(instance, offline=None):
    mod_dir = instance / "mods"
    current = [p for p in sorted(mod_dir.glob("*.jar")) if p.name.lower() == JAR.lower() or is_jenny(p)]
    conflicts = [p for p in current if digest(p) != SHA256]
    if conflicts or len(current) > 1:
        raise ValueError("请先将不同版本或重复的 JennySP 移出 mods，再重新安装：\n" +
                         "\n".join(map(str, current)))
    if offline and digest(offline) != SHA256:
        raise ValueError("离线文件 SHA-256 与指定的 2.7.4 发行版不符：" + str(offline))
    with tempfile.TemporaryDirectory(prefix="mc-anime-stage-", dir=instance) as directory:
        stage = Path(directory)
        changes = []
        source = current[0] if current else stage / JAR
        if not current:
            if offline:
                shutil.copyfile(offline, source)
            else:
                print("正在下载 JennySP 2.7.4 …", flush=True)
                with urlopen(Request(URL, headers={"User-Agent": "mc-anime-installer/1.0"}), timeout=90) as response:
                    with source.open("wb") as out:
                        shutil.copyfileobj(response, out)
            if digest(source) != SHA256:
                raise ValueError("下载文件校验失败，请重试或使用 --jar 指定完整的 2.7.4 原包。")
            changes.append((source, mod_dir / JAR))
        model = stage / MODEL.name
        build_pack(source, model)
        if not same_pack(model, instance / MODEL):
            changes.append((model, instance / MODEL))
        # Isolated PCL instances need the same scripts and datapack as the repository instance.
        for subtree in ("startup_scripts", "server_scripts", "client_scripts", "data", "assets"):
            for src in sorted((PACK / "kubejs" / subtree).rglob("*")):
                if not src.is_file():
                    continue
                dst = instance / src.relative_to(PACK)
                if src.resolve() == dst.resolve() or (dst.is_file() and digest(src) == digest(dst)):
                    continue
                changes.append((src, dst))
        if not changes:
            print("已是指定版本，模型和女仆脚本均已就位。")
            return
        backup = instance / "mc-anime-backups" / datetime.now().strftime("%Y%m%d-%H%M%S-%f")
        applied = []
        try:
            for index, (src, dst) in enumerate(changes):
                dst.parent.mkdir(parents=True, exist_ok=True)
                previous = None
                if dst.exists():
                    previous = backup / dst.relative_to(instance)
                    previous.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(dst, previous)
                tmp = stage / ("install-" + str(index))
                shutil.copy2(src, tmp)
                tmp.replace(dst)
                applied.append((dst, previous))
        except OSError:
            for dst, previous in reversed(applied):
                if previous:
                    shutil.copy2(previous, dst)
                else:
                    dst.unlink()
            raise
        if backup.exists():
            print("已备份被更新的文件：" + str(backup))
        print("已安装到 " + str(instance) + "。重启游戏后输入 /mkjenny recruit。")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path, nargs="?", help="启动器显示的实际游戏目录")
    parser.add_argument("--instance", type=Path, help="直接指定 Forge 游戏实例")
    parser.add_argument("--jar", type=Path, help="使用已下载的官方 2.7.4 JAR 离线安装")
    args = parser.parse_args()
    if args.directory and args.instance:
        parser.error("只需指定一个实例目录。")
    try:
        install(select_instance(args.instance or args.directory), args.jar)
    except (OSError, ValueError, KeyError, zipfile.BadZipFile) as err:
        parser.exit(1, str(err) + "\n")


if __name__ == "__main__":
    main()
