"""Build a Touhou Little Maid model pack from a locally installed JennySP 2.7.4 jar."""
import argparse
import json
import tempfile
from pathlib import Path
from zipfile import BadZipFile, ZIP_DEFLATED, ZipFile

GEOMETRY = "assets/sexmod/geo/jenny/jennydressed.geo.json"
TEXTURE = "assets/sexmod/textures/entity/jenny/jenny.png"
ANIMATIONS = "assets/sexmod/animations/jenny/jenny.animation.json"
MODEL_ID = "mk_jenny:jenny"


def find_jar(instance):
    for path in sorted((instance / "mods").glob("*.jar")):
        try:
            with ZipFile(path) as jar:
                if GEOMETRY in jar.namelist():
                    return path
        except BadZipFile:
            continue
    raise ValueError("在实例的 mods 目录中找不到 JennySP 2.7.4，请先安装或用 --jar 指定文件。")


def maid_geometry(native):
    geometry = native["minecraft:geometry"][0]
    description = geometry["description"]
    description.update(identifier="geometry.mk_jenny", visible_bounds_width=3,
                       visible_bounds_height=3, visible_bounds_offset=[0, 1, 0])
    # JennySP switches many scene props and alternate expressions in its own renderer.
    # Keep the everyday outfit, a neutral face and the two points TLM uses to render held items.
    bones = {bone["name"]: bone for bone in geometry["bones"]}
    excluded = {"items", "steve", "armorHelmet", "heart", "blush", "girlCam",
                "closedL", "closedR", "boobsFlesh", "vagina", "fleshL", "fleshR"}
    included = {"body"}
    for _ in range(len(bones)):
        children = {name for name, bone in bones.items()
                    if bone.get("parent") in included and name not in excluded
                    and (bone.get("parent") != "mouth" or name == "normalSmile")}
        if children <= included:
            break
        included.update(children)
    model = [bone for name, bone in bones.items() if name in included]
    for side, parent in (("Left", "customHandL"), ("Right", "customHandR")):
        model.append({"name": side + "HandLocator", "parent": parent, "pivot": bones[parent]["pivot"]})
    geometry["bones"] = model
    return included


def build_pack(source, output):
    with ZipFile(source) as jar:
        native = json.loads(jar.read(GEOMETRY))
        bones = maid_geometry(native)
        moves = json.loads(jar.read(ANIMATIONS))["animations"]
        texture = jar.read(TEXTURE)
    animations = {}
    for action, move in {"idle": "idle", "walk": "walk", "run": "run",
                         "sit": "sit", "swing_hand": "attack0"}.items():
        src = moves["animation.jenny." + move]
        clip = {key: src[key] for key in ("loop", "animation_length") if key in src}
        clip["bones"] = {name: keys for name, keys in src["bones"].items() if name in bones}
        animations[action] = clip
    descriptor = {
        "pack_name": "断潮哨站", "version": "1.0", "author": ["JennySP / mc-anime"],
        "model_list": [{"model_id": MODEL_ID, "name": "珍妮", "is_gecko": True,
                        "animation": ["mk_jenny:animation/jenny.json"], "render_entity_scale": 0.85}]
    }
    assets = "assets/mk_jenny/"
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=output.parent) as tmp:
        staged = Path(tmp) / output.name
        with ZipFile(staged, "w", compression=ZIP_DEFLATED) as pack:
            # TLM discovers namespaces from directory entries inside zipped packs.
            pack.writestr("assets/", b"")
            pack.writestr(assets, b"")
            for name, obj in {
                "pack.mcmeta": {"pack": {"pack_format": 15, "description": "断潮哨站 · 珍妮"}},
                assets + "maid_model.json": descriptor,
                assets + "models/entity/jenny.json": native,
                assets + "animation/jenny.json": {"format_version": "1.8.0", "animations": animations},
            }.items():
                pack.writestr(name, json.dumps(obj, ensure_ascii=False).encode("utf-8"))
            pack.writestr(assets + "textures/entity/jenny.png", texture)
        staged.replace(output)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("instance", type=Path, nargs="?",
                        default=Path(__file__).resolve().parents[1] / "game" / ".minecraft")
    parser.add_argument("--jar", type=Path, help="JennySP Forge 1.20.1 jar")
    args = parser.parse_args()
    if not args.instance.is_dir():
        parser.error("游戏实例目录不存在。")
    output = args.instance / "tlm_custom_pack" / "mc-anime-jenny.zip"
    try:
        build_pack(args.jar or find_jar(args.instance), output)
    except (OSError, BadZipFile, KeyError, ValueError) as error:
        parser.exit(1, str(error) + "\n")
    print(output)


if __name__ == "__main__":
    main()
