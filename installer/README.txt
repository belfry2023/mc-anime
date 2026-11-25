mc-anime 整合包 —— 客户端安装包
================================

包含内容
--------
payload\game\.minecraft    整合包本体（mods / config / kubejs / tacz / 女仆模型包 / 虚拟世界等）
payload\jdk                自带 Java 17（不需要另外装 Java）
payload\launch-game.ps1    启动脚本（会自动拼 Forge 1.20.1 的启动参数）

安装方法
--------
1. 把整个安装包文件夹拷到目标电脑（U 盘 / 移动硬盘 / 局域网共享都行）。
2. 双击 setup.exe（如果没有，双击 setup.bat）。
3. 按提示回车：
   - 安装目录：默认 %LOCALAPPDATA%\mc-anime，回车即用；
   - 游戏昵称：随便起；
   - 内存：默认 6G，8G 内存的机器建议 4G。
4. 装完桌面会出现「玩 mc-anime」快捷方式，双击即可启动。

注意事项
--------
- 首次启动会比平时慢（Forge 要展开并生成配置），进到主菜单约 1~3 分钟。
- 想改昵称 / 内存：编辑安装目录里的 username.txt、memory.txt。
- 存档在 game\.minecraft\saves，换电脑时把整个 saves 文件夹拷过去即可。
- 安装目录里 game\.minecraft\mods 是模组本体，不要随意增删，否则可能启动失败。
- 本整合包中文界面：游戏内 选项 → 语言 → 简体中文。
