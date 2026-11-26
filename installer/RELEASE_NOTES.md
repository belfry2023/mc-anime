# mc-anime 整合包 v1.0.0

Minecraft **1.20.1 / Forge 47.4.29** 整合包，43 个模组，主打「二次元女仆 + 咒术战斗 + 殖民地文明 + 城防战 + 枪械」。

## 文件

| 文件 | 说明 |
|---|---|
| **`mc-anime-patch-2026-11-26.zip`** | **修复补丁（约 0.5MB）**：解压后覆盖到 mc-anime 文件夹的同名位置即可 |
| `mc-anime-client.zip` | 客户端整包（约 1.6GB）——**正文见下方「关于主包」** |
| `setup.ps1` / `setup.exe` | 可选安装器：双击后选目录、填昵称和内存，自动解压并建桌面快捷方式 |

> **关于主包**：2026-11-26 重建的新版主包因上传带宽问题暂时撤下重新上传中。已经拿到过旧主包的朋友，**只需要打上 `mc-anime-patch-2026-11-26.zip` 这个补丁**就能正常启动。

## 安装 / 修复步骤

1. 解压 `mc-anime-client.zip` 到任意目录（建议 `D:\Games\mc-anime`，路径别带奇怪字符）
2. 解压 `mc-anime-patch-2026-11-26.zip`，把里面的内容**覆盖**到该目录（替换 `launch-game.ps1`、`启动游戏.bat` 和 `game` 里几个文件）
3. 需要的话新建 `username.txt` 写昵称、`memory.txt` 写 `4` 或 `6`（不写默认 4G）
4. 双击 **`启动游戏.bat`**；启动失败时窗口会停住并打印错误

## 2026-11-26 修复了什么

- **启动器不再写死路径**：旧版把 `-Djava.io.tmpdir=C:\Users\belfry\...` 打进 `versions/*.json`，别人机器上该目录不存在 → `NoSuchFileException` / `Unable to extract the nested MaidSpell mod`。现在启动器自己在包内建 `tmp`。
- **`memory.txt` 随便写**：`4` / `4G` / `6GB` 都能识别，并自动限制在本机内存 60% 以内，修 `Initial heap size ... larger than maximum heap size`。
- **启动失败看得见**：`启动游戏.bat` 改为前台运行，报错留在窗口里（之前是隐藏窗口启动，失败毫无提示）。
- **战斗模式闪退**：新增 EpicYSM 兼容模组并关闭 `armor_on_models`，修复 YSM × Epic Fight 渲染玩家时的 `ClassCastException` / `searchJointById` NPE。
- **联机**：内置 mcwifipnp（Esc → 对局域网开放，可关正版验证）。

> 如果还报 `ClassNotFoundException: jdk.nio.zipfs.ZipPath`（解压模组需要 `jdk.zipfs`），说明旧包用的是 jlink 精简运行时：装一个完整的 **Java 17（Temurin 17）** 即可；新版主包已自带完整 JDK 17，不会再有这个问题。

## 内置指令速查

| 指令 | 作用 |
|---|---|
| `/mkplat [小/大/巨大]` | 在你脚下铺一块平地 |
| `/mkcity [colonial/medieval_oak/asian/shire/…]` | 一键放置一座现成的殖民地城 |
| `/mkcolony` | 领一套殖民地建造用品（市政厅、建筑工、民居…） |
| `/mkcolony mats` | 领一箱 1 级建材 |
| `/mkbuild` / `/mkbuild auto` | 自动给建筑工补齐材料（创造模式自动补） |
| `/mkboost` | 市民技能拉满 + 给建筑工塞附魔工具 |
| `/mkresearch` | 一键解锁全部大学研究 |
| `/mkmats` | 领 235 种建材各 4 组 |
| `/mkmaid` | 女仆自动帮你砌工地 |
| `/mksiege on` | 尸潮模式：怪物会主动围城 |
| `/mkwar build|start|stop` | 自建堡垒 + 波次攻防小游戏 |
| `/mkboss` | 灾变 BOSS 雷达（找结构） |
| `/mkguard [on/off]` | 铁魔法法师渲染崩溃保护 |
| `/mkhome`、`/savehome` | 把你自己造的房子导出/复刻 |

## 键位

- `Ctrl+V` 趴下（再点一次起身；蹲/跳/冲刺也会自动起身）
- 右键点一下开镜并保持；再点逐步升倍率，最大倍率后再点回腰射
- 完整键位见包内《键位方案.md》

## 说明

- 这个包是**我自己玩的自用整合**，模组版权归各自作者，不要拿去商用
- 存档默认在整合包目录里（`game\.minecraft\saves`），换电脑直接整个目录拷走即可
- 第一次进游戏若提示数据包错误，运行 `tools\fix_level_dat_packs.py`（需 Python）修 `level.dat`
