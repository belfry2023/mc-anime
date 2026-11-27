# -*- coding: utf-8 -*-
"""生成《mc-anime 新手安装教程》docx + txt（给朋友的纯小白版本）。"""
import io
import os

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.shared import Pt, RGBColor

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dist", "给朋友")
OUT_DIR = os.path.abspath(OUT_DIR)

SECTIONS = []


def h1(text):
    SECTIONS.append(("h1", text))


def h2(text):
    SECTIONS.append(("h2", text))


def p(text):
    SECTIONS.append(("p", text))


def bullet(text):
    SECTIONS.append(("b", text))


def table(rows):
    SECTIONS.append(("t", rows))


TITLE = "mc-anime 整合包 · 新手安装教程"
SUBTITLE = "适用 Windows 10 / 11（64 位）| 版本：2026-11-27 | 全程不需要安装 Java / Python / Git"

h1("〇、你会收到哪些文件")
p("让房主把下面这些文件一起发给你（放到同一个文件夹里，比如 D:\\下载\\mcanime）：")
bullet("mc-anime-client.zip —— 主包，约 1.6 GB，游戏本体（必须完整下载，不能只下载一半；名字被浏览器改成 mc-anime-client (1).zip 也没关系）")
bullet("setup.exe —— 安装器（双击它就行）")
bullet("setup.ps1 —— 安装器要用的脚本，必须和 setup.exe 放同一个文件夹")
bullet("（可选）mc-anime-patch-2026-11-26.zip —— 只有你之前已经有旧包时才需要，用于打补丁")
p("如果只收到 mc-anime-client.zip 一个文件，也能装，看第二节「路线 B」。")

h1("一、装之前先确认三件事")
h2("1. 电脑够不够")
bullet("系统：Windows 10 或 Windows 11，64 位")
bullet("内存：8 GB 以上能玩，16 GB 更顺（4 GB 的电脑基本跑不动）")
bullet("硬盘：至少留 5 GB 空闲空间（1.6 GB 压缩包 + 约 3.4 GB 解压后）")
bullet("显卡：近几年的核显也能进游戏，只是帧数低一些")
h2("2. 放在哪里")
bullet("安装目录建议 D:\\Games\\mc-anime 这种简单路径")
bullet("不要装在 C:\\Program Files（需要管理员权限，容易出错）")
bullet("不要放在 OneDrive / 桌面同步文件夹（会被同步程序锁文件）")
h2("3. 千万不要做的事")
bullet("不要在压缩包里面直接双击启动文件 —— 必须先解压/安装")
bullet("下载过程中不要关浏览器、不要断网，1.6 GB 下完再动")
bullet("不要自己往 game\\.minecraft\\versions 里的 json 文件加任何参数")

h1("二、安装：两条路，选路线 A 就行")
h2("路线 A：双击安装器（推荐，最省事）")
bullet("第 1 步：打开放文件的文件夹，确认 zip、setup.exe、setup.ps1 在同一个文件夹里（zip 叫什么名字都行，安装器会自动找体积最大的那个 zip）")
bullet("第 2 步：双击 setup.exe")
bullet("第 3 步：如果弹出蓝色的「Windows 已保护你的电脑」，点「更多信息」→ 再点「仍要运行」")
bullet("第 4 步：黑窗口会问你三个问题 ——")
bullet("　① 安装到哪个目录？直接按回车 = 我的文档\\mc-anime；想装 D 盘就输入 D:\\Games\\mc-anime 再回车")
bullet("　② 游戏内昵称？只能填 英文字母/数字/下划线（例如 ming_xm），不能有中文和空格；每个人必须不一样，填好回车")
bullet("　③ 分配内存？直接按回车（脚本会按你电脑内存自动给建议值，一般是 4 或 6）")
bullet("第 5 步：等它解压。固态硬盘 1~3 分钟，机械硬盘 3~8 分钟。窗口会显示进度文字，别关窗口")
bullet("第 6 步：看到「安装完成！」就成功了。桌面上会多出一个「玩 mc-anime」")
bullet("第 7 步：双击桌面「玩 mc-anime」，游戏会启动。第一次启动要加载 43 个模组，等 1~3 分钟属于正常")
p("如果安装器窗口里出现「[注意] 体检发现问题」，把那几行截图发回给房主，不要自己乱改。")

h2("路线 B：手动解压（安装器打不开时用）")
bullet("第 1 步：右键 mc-anime-client.zip →「全部解压缩」→ 目标填 D:\\Games\\mc-anime（也可以「解压到 mc-anime-client\\」，再把里面的东西挪出来）")
bullet("第 2 步：解压完打开目录，应该能直接看到 game 文件夹、jdk 文件夹、launch-game.ps1、启动游戏.bat 这四个东西")
bullet("第 3 步（可选，设昵称）：在这个目录新建一个文本文档，改名为 username.txt，打开写你的名字，保存")
bullet("第 4 步（可选，设内存）：新建文本文档改名 memory.txt，里面写 4 或者 6G，保存。两个都不建就默认 4G")
bullet("第 5 步：双击 启动游戏.bat")

h1("三、第一次进游戏怎么操作")
bullet("等主菜单出现后，点「单人游戏」→「创建新的世界」→ 起个名字，其他默认，点「创建」")
bullet("想开作弊（单机才有的选项）：创建世界时点「更多」→ 打开「允许作弊」")
bullet("想和房主在同一个 WiFi 下联机：进游戏后按 Esc →「对局域网开放」，聊天栏会打印类似 192.168.1.10:25565 的地址，把它发给房主")
bullet("退出游戏：Esc →「保存并退出」。单人存档会自动保存，不用手动存档")

h1("四、出问题了怎么办（照着这张表查）")
table([
    ("你看到的情况", "怎么处理"),
    ("双击没反应，或者一闪就没了",
     "去安装目录双击 启动游戏.bat（不是桌面快捷方式），窗口会停住显示真正的报错"),
    ("此名称已被占用（进朋友服务器时）",
     "你的昵称和别人重名了（最常见：默认都是 Player）。把 username.txt 改成一个别人没用的英文名再启动；名字定了就别改，改名等于换新角色、物品不会跟过来"),
    ("Invalid characters in username",
     "昵称里有中文/空格/符号。只留英文字母、数字、下划线"),
    ("Unable to extract the nested MaidSpell mod / NoSuchFileException ... tmp",
     "你的包是旧版。装新版主包，或把 mc-anime-patch-2026-11-26.zip 解压覆盖到安装目录"),
    ("ClassNotFoundException: jdk.nio.zipfs.ZipPath",
     "旧包的 Java 是精简版。换新版主包；临时办法是装一个 Temurin 17"),
    ("Initial heap size ... larger than maximum heap size",
     "内存写太大了。把 memory.txt 改成 4，或者直接删掉 memory.txt"),
    ("找不到 MSVCP140.dll",
     "装微软运行库（64 位）：https://aka.ms/vs/17/release/vc_redist.x64.exe ，装完重启"),
    ("一进战斗模式就闪退（看了别人或切第三人称就崩）",
     "旧包缺 EpicYSM 兼容模组。装新版主包，或打补丁"),
    ("卡在「正在启动」很久 / 黑窗口一直在滚字",
     "第一次启动加载模组慢，等 3 分钟。还是不行就看 game\\.minecraft\\logs\\latest.log 最后 50 行，截图发回"),
    ("进去很卡、帧数很低",
     "Esc → 选项 → 视频设置，把渲染距离调到 8 以下；关掉后台的浏览器/录屏；更新显卡驱动"),
    ("杀毒软件弹窗、游戏变慢",
     "把安装目录加入 Windows Defender 的「排除项」"),
    ("提示端口/内存/Java 之类的其它红字",
     "别改文件。把黑窗口红字整段截图发回给房主"),
])

h1("五、日常怎么用")
bullet("启动：双击桌面「玩 mc-anime」；或打开安装目录双击 启动游戏.bat")
bullet("存档在 安装目录\\game\\.minecraft\\saves ，把这个文件夹整个复制走就是备份")
bullet("换电脑：把整个安装目录拷到新电脑，同样双击 启动游戏.bat 就能玩")
bullet("房主发来新的补丁 zip：解压后把里面的文件覆盖到安装目录同名位置，然后正常启动")
bullet("不玩了：直接关窗口；单人世界会自动保存")

h1("六、记住一句话")
p("任何一步出现你不想懂的红字报错 —— 截图发回给房主，不要自己去改配置文件、不要自己删文件。")

h1("附：这个包已经自带的东西（所以你什么都不用装）")
bullet("完整 Java 17 运行时（在 jdk 文件夹里）—— 不需要另外装 Java")
bullet("Forge 47.4.29 + 43 个模组（在 game\\.minecraft\\mods 里）")
bullet("启动器（launch-game.ps1）会自动建临时目录、自动限制内存、启动失败会停住显示错误")
bullet("不需要 Python、不需要 Git、不需要 CurseForge、不需要正版账号（单机随便玩）")


def build_docx(path):
    doc = Document()
    style = doc.styles["Normal"]
    style.font.name = "微软雅黑"
    style.font.size = Pt(10.5)
    style.element.rPr.rFonts.set(qn("w:eastAsia"), "微软雅黑")

    title = doc.add_paragraph()
    run = title.add_run(TITLE)
    run.bold = True
    run.font.size = Pt(20)
    run.font.name = "微软雅黑"
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "微软雅黑")

    sub = doc.add_paragraph()
    srun = sub.add_run(SUBTITLE)
    srun.font.size = Pt(9)
    srun.font.color.rgb = RGBColor(0x60, 0x60, 0x60)

    for kind, payload in SECTIONS:
        if kind == "h1":
            doc.add_paragraph(payload, style="Heading 1")
        elif kind == "h2":
            doc.add_paragraph(payload, style="Heading 2")
        elif kind == "p":
            doc.add_paragraph(payload)
        elif kind == "b":
            doc.add_paragraph(payload, style="List Bullet")
        elif kind == "t":
            rows = payload
            tbl = doc.add_table(rows=0, cols=2)
            tbl.style = "Table Grid"
            tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
            for i, (a, b) in enumerate(rows):
                cells = tbl.add_row().cells
                cells[0].text = a
                cells[1].text = b
                if i == 0:
                    for c in cells:
                        for para in c.paragraphs:
                            for r in para.runs:
                                r.bold = True
            for row in tbl.rows:
                row.cells[0].width = Pt(190)
                row.cells[1].width = Pt(260)

    doc.save(path)


def build_txt(path):
    lines = [TITLE, SUBTITLE, "=" * 60, ""]
    for kind, payload in SECTIONS:
        if kind == "h1":
            lines += ["", payload, "-" * 50, ""]
        elif kind == "h2":
            lines += ["", payload, ""]
        elif kind == "p":
            lines += [payload, ""]
        elif kind == "b":
            lines += ["  · " + payload]
        elif kind == "t":
            lines += [""]
            for a, b in payload:
                lines += ["  【" + a + "】", "      -> " + b, ""]
    io.open(path, "w", encoding="utf-8-sig", newline="\r\n").write("\n".join(lines))


if __name__ == "__main__":
    if not os.path.isdir(OUT_DIR):
        os.makedirs(OUT_DIR)
    docx_path = os.path.join(OUT_DIR, "mc-anime 新手安装教程.docx")
    txt_path = os.path.join(OUT_DIR, "新手安装教程.txt")
    build_docx(docx_path)
    build_txt(txt_path)
    print("docx:", docx_path, os.path.getsize(docx_path))
    print("txt :", txt_path, os.path.getsize(txt_path))
