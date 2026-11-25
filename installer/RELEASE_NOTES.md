# mc-anime 整合包 v1.0.0

Minecraft **1.20.1 / Forge 47.4.29** 整合包，41 个模组，主打「二次元女仆 + 咒术战斗 + 殖民地文明 + 城防战 + 枪械」。

## 下载

| 文件 | 说明 |
|---|---|
| `mc-anime-client.zip` | 客户端整包（约 1.6GB），解压即玩，自带剪裁过的 Java 17 运行时 |
| `setup.ps1` / `setup.exe` | 可选安装器：双击后选目录、填昵称和内存，自动解压并建桌面快捷方式 |
| `mc-anime-server.zip`（另附） | 服务端一键包，跑 `服务器安装.bat` 即可建服 |

## 客户端怎么装

**方式一（推荐，安装器）**

1. 把 `mc-anime-client.zip`、`setup.exe`、`setup.ps1` 放到同一个文件夹
2. 双击 `setup.exe` → 选安装目录 → 填昵称 / 内存
3. 桌面上出现「玩 mc-anime」，双击开玩

**方式二（手动）**

1. 把 `mc-anime-client.zip` 解压到任意目录（路径别带中文以外的怪字符，建议 `D:\Games\mc-anime`）
2. 新建 `username.txt` 写你的昵称（可选，默认「玩家」）、`memory.txt` 写 `4G` / `6G`（可选）
3. 双击 `启动.bat`

## 联机

- **局域网**：主机进游戏后 `Esc → 对局域网开放`，同网段的朋友在「多人游戏 → 直接连接」填主机内网 IP:端口
- **外网**：用 Radmin VPN / ZeroTier 组虚拟局域网，然后同上直连
- **独立服务器**：用单独的服务端包跑 `服务器安装.bat`，客户端在「直接连接」里填 IP:25565
- 服务器默认 `online-mode=false`（盗版/离线客户端也能进），要正版验证就把 `server.properties` 里改成 `true`

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
