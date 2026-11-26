# 车万女仆 · 二次元美少女养成 + 战斗 + 大模型 整合包

拉取本版后，使用独立 PCL 目录的玩家请将仓库的整个 `game/.minecraft/kubejs` 合并到实际游戏目录并重启。珍妮可通过根目录的 **安装珍妮.bat** 安装，安装器同时完成这次同步。

四人咒术小队会在新世界首次进入时集合。旧存档可用 `/mkarmy` 接入，按小键盘 0 查看咒力。领域实拍、太刀会心、战斗键位、珍妮和五章任务见[咒术小队操作指南](squad-guide.md)。


本目录是一套独立的 Minecraft 1.20.1 Forge 环境，没有动你原来的 `Desktop\.minecraft` 和 `Downloads\.minecraft`。

## 怎么启动

1. 双击本目录里的 `启动.bat`（或直接开 `game\PCL2启动器.exe`）。
2. 在 PCL 里选择版本 **1.20.1-forge-47.4.29**，点启动。
3. 第一次启动 PCL 会自己补下游戏资源（assets，约几百 MB），耐心等它下完。
4. Java 已经配好：`jdk\jdk-17.0.21+9`，也已经写进 PCL 的 Java 列表，不用手动选。

## 装了什么

| 类别 | Mod |
| --- | --- |
| 女仆本体 | 车万女仆 TLM 1.5.3 |
| 性格/养成 | TLM Personality 1.5.2、Heart Pact（结婚）、Affection（好感）、Spice of Life: Maid（口味）、Maid Useful Task、Beacon、Self-Talk |
| 战斗 | Epic Fight 20.14.17、EpicFight: TLM 1.3.6、Epic Fight - Avalon 20.12.6.4、契约之刃 Contract Blade 1.2.1 |
| 法术 | TLM: Spell 1.9.3.2（自带 Iron's Spells / 拔刀剑 / 枪械等兼容模块） |
| 模型 | Yes Steve Model 2.6.5 + EpicYSM 1.1.4 |
| 武器 | TaCZ（Timeless and Classics Zero）1.2.0 + LesRaisins 枪包 0.3.0；Artifacts 9.5.19（神器，依赖 Curios 5.14.1、Architectury 9.2.14、Cloth Config 11.1.136） |
| 科技 | Mekanism 10.4.16.80（激光、发电、机械） |
| 轨道炮 | The Shooting Star [Demo] 1.5.2 + RimuLib 1.2.2（B 站 BV1DqH764EYU 那个轨道炮；SS-01 Shooting Star / SS-03 Gungnir / SS-04 Seven Stars / SS-05 Tesseract / SS-06 Gravitia） |
| 说明书 | Patchouli 1.20.1-85（补上 TLM 手册的前置，游戏里就不会再提示装它） |
| BOSS | L_Ender's Cataclysm 3.31（+ LionfishAPI 3.0）、Mutant Monsters 8.0.8（+ Puzzles Lib 8.1.36） |

注：**Epistalove 没装**——和 TLM 自带 AI 聊天冲突会崩。

## 大模型对话怎么开

TLM 1.5.x 自带 AI 聊天，不需要额外 AI mod：

1. 进游戏，打开女仆面板的 AI 对话入口。本包键位方案使用 **X** 进行女仆语音对话。
2. 左边点「LLM 站点编辑器」，新建站点：
   - 地址：`https://api.deepseek.com`
   - 模型：`deepseek-chat`
   - 密钥：填你自己的 DeepSeek key
3. 想用本地 ollama：地址填 `http://127.0.0.1:11434/v1`，密钥随便填个非空的，模型填你本地拉的名字。
4. 性格会拼进 AI 的前置词，所以先给女仆选性格，聊起来才像那个角色。
5. 站点也可以写在 `game\.minecraft\config-touhou_little_maid\available_sites.yml`，改完游戏里执行 `/tlm ai_chat reload`。

## 模型包（二次元建模）

- 女仆模型包是 **zip 或文件夹**，放到 `game\.minecraft\tlm_custom_pack\` 里，重启游戏后在女仆界面换模型。
- 现在目录里已经放了：`star_witch_winefox-1.0.0`（酒狐的「星之魔女」模型包）、`touhou_little_maid-1.0.0`（TLM 默认女仆包）、`contract-blade-fox-1.0.0.zip`（契约之刃的狐狸模型）。
- 换模型：对着女仆右键打开界面 → 找「模型」页签（裙子图标）→ 选想要的模型 → 确认；没有模型页签说明这个包没被认到，看日志里有没有 pack 加载报错。
- 一手素材：WineFoxModel（酒狐模型，TartaricAcid）<https://github.com/TartaricAcid/WineFoxModel>
- B 站合集：BV1Q91UBzEkF

## 已做的验证

- Forge 1.20.1-47.4.29 服务端试跑通过：TLM、Spell、Personality、契约之刃、EpicFight、Avalon 全部载入，日志里出现 `Done (3.587s)!`，没有缺依赖。
- 顺手修了两个环境坑：
  - 系统 Temp 目录不让建临时文件夹（Forge 安装器和 TLM: Spell 都撞上过）。**注意不要往版本 JSON 里写死绝对路径**：早先那样做过，导致别人解压后 `levels\*.json` 指向我的机器路径，报 `NoSuchFileException` 和 `Unable to extract the nested MaidSpell mod`，游戏根本起不来。现在改成 `launch-game.ps1` 启动时把 `TMP`/`TEMP` 和 `-Djava.io.tmpdir` 都设到整合包自己的 `tmp\` 下（`$PSScriptRoot` 相对路径），换机器、换盘符、换中文路径都能跑。
  - `eula.txt` 去掉了 BOM（只影响 server-test，客户端用不到）。
- 1.20.1 原版库文件已补齐；游戏资源（assets，约 624MB）已预下载。
- 02:51 又跑了一次服务端冒烟测试，加入 TaCZ + LesRaisins 枪包、Artifacts + Curios + Architectury + Cloth Config、Mekanism、Patchouli 之后仍然载入成功、无缺依赖（未知属性 `irons_spellbooks:*`、`caelus:fall_flying` 是可选模组没装的正常警告）。
- 02:58 再测一次，加入 The Shooting Star 1.5.2 + RimuLib 1.2.2 后仍是 `Done (3.379s)!`。第一次报 `Address already in use: bind` 是上一轮服务端还占着 25565 端口，不是模组问题，换 25566 就通过了。
- 06:46 加了两套 BOSS（L_Ender's Cataclysm 3.31 + LionfishAPI、Mutant Monsters 8.0.8 + Puzzles Lib）再测，27 个 mod 全部载入，`Done (3.646s)!`。日志里的 slashblade ClassNotFound 是 TLM: Spell 的可选兼容 mixin 在找没装的拔刀剑，属于正常警告。

## 出问题了看这里

- 日志：`game\.minecraft\logs\latest.log`
- 契约之刃是 beta，进游戏前先备份存档（`.minecraft\saves`）。
- 如果进不去，先把 `mods` 里的 EpicFight: TLM 和 Avalon 挪出去，只留 TLM 本体，确认能进再逐个加回来。
- 第一次启动慢是正常的（PCL 下资源 + Forge 补库）。

## 已知冲突
- YSM（Yes Steve Model）玩家模型 × EpicFight 战斗态：EpicFight 的 PPlayerRenderer 会把渲染器强转成 PlayerRenderer，YSM 换掉的渲染器不是它的子类，按 R 进战斗态就会 ClassCastException 崩溃（2026-11-12 18:48 的 crash-report 为证）。当前取舍：`DisableSelfModel = true`，先保证不崩；想换回自己的二次元皮就关掉 EpicFight。
