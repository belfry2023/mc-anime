// ===== 山顶现代别墅 v4 =====
// 重写目标（用户要求）：
//  ① 楼梯：用「台阶(slab)」而非楼梯；台阶上方 3 格不得有方块阻挡；楼梯宽度 = 2 方块
//  ② 地下武库：墙/天花板/地板用海晶灯；三个隔间（武器制造车间 / 仓管室 / 展厅连廊）
//  ③ 一层三个隔间：楼梯间+仓管室 / 待客厅 / 厨房
//  ④ 二层分：卧室 / 工作室
//  ⑤ 一二层采光、灯光充足；方便上下楼
//  ⑥ 庭院：田地 + 草地 + 泳池 + 门口修路 + 红石科技高级感
//
// 模块化：本文件负责 地基 / 外壳 / 楼梯 / 门廊道路 / 红石 / 命令注册；
// 地下武库、一层、二层、庭院 分别由 home_armory.js / home_first.js / home_second.js / home_court.js 填充，
// 各模块通过 global.mkHomeXxx(env) 挂载，/mkhome 时按序调用（见 buildHome）。

// ---------- 环境对象：坐标 + 方块表 + 指令助手 ----------
function mkHomeMakeEnv(server, p) {
  var px = Math.floor(p.x)
  var py = Math.floor(p.y)
  var pz = Math.floor(p.z)
  var run = (c) => server.runCommandSilent(c)
  return {
    px: px, py: py, pz: pz, server: server, player: p,
    run: run,
    fill: (x0, y0, z0, x1, y1, z1, b) => run(`fill ${x0} ${y0} ${z0} ${x1} ${y1} ${z1} ${b}`),
    set: (x, y, z, b) => run(`setblock ${x} ${y} ${z} ${b}`),
    // 地基平台
    gx0: px - 18, gx1: px + 18, gz0: pz - 16, gz1: pz + 16,
    // 房屋外壳（一层/二层同一 footprint）
    x0: px - 10, x1: px + 10, z0: pz - 7, z1: pz + 7,
    // 层高（方块 Y，站在上面脚底 = Y+1）
    f1: py + 1,   // 一层脚底
    c1: py + 4,   // 一层天花板 = 二层地板
    f2: py + 5,   // 二层脚底
    roof: py + 8, // 屋顶
    // 地下武库（与房屋同 footprint）
    ax0: px - 10, ax1: px + 10, az0: pz - 7, az1: pz + 7,
    ay0: py - 8, ay1: py - 3
  }
}

// ---------- 地基与山顶平台 ----------
function mkHomeBase(env) {
  var f = env.fill
  // 山体基石
  f(env.gx0 - 2, env.py - 10, env.gz0 - 2, env.gx1 + 2, env.py - 1, env.gz1 + 2, 'minecraft:stone')
  // 平台顶 = 草地（后续各区域覆盖：房屋/田地/泳池/道路）
  f(env.gx0, env.py, env.gz0, env.gx1, env.py, env.gz1, 'minecraft:grass_block')
  // 平台外沿石英台阶收口
  f(env.gx0, env.py, env.gz0, env.gx1, env.py, env.gz0, 'minecraft:smooth_quartz_slab')
  f(env.gx0, env.py, env.gz1, env.gx1, env.py, env.gz1, 'minecraft:smooth_quartz_slab')
  f(env.gx0, env.py, env.gz0, env.gx0, env.py, env.gz1, 'minecraft:smooth_quartz_slab')
  f(env.gx1, env.py, env.gz0, env.gx1, env.py, env.gz1, 'minecraft:smooth_quartz_slab')
}

// ---------- 房屋外壳（墙/楼板/屋顶/窗/门/立柱/阳台） ----------
function mkHomeShell(env) {
  var f = env.fill, s = env.set
  var px = env.px, py = env.py, pz = env.pz
  var x0 = env.x0, x1 = env.x1, z0 = env.z0, z1 = env.z1

  // 一层地板（桦木）
  f(x0, py, z0, x1, py, z1, 'minecraft:birch_planks')
  // 一层墙（白混凝土，空心）+ 室内空气
  f(x0, py + 1, z0, x1, py + 3, z1, 'minecraft:white_concrete hollow')
  f(x0 + 1, py + 1, z0 + 1, x1 - 1, py + 3, z1 - 1, 'minecraft:air')
  // 一层天花板 = 二层地板
  f(x0, py + 4, z0, x1, py + 4, z1, 'minecraft:birch_planks')
  // 二层墙 + 室内空气
  f(x0, py + 5, z0, x1, py + 7, z1, 'minecraft:white_concrete hollow')
  f(x0 + 1, py + 5, z0 + 1, x1 - 1, py + 7, z1 - 1, 'minecraft:air')
  // 屋顶（石英）+ 檐口
  f(x0, py + 8, z0, x1, py + 8, z1, 'minecraft:smooth_quartz')
  f(x0 - 1, py + 8, z0 - 1, x1 + 1, py + 8, z1 + 1, 'minecraft:smooth_quartz_slab')
  // 屋顶天窗（采光）
  f(px - 3, py + 8, pz - 2, px - 1, py + 8, pz, 'minecraft:glass')
  f(px + 1, py + 8, pz - 2, px + 3, py + 8, pz, 'minecraft:glass')

  // 四角橡木立柱（贯穿两层）
  var cx = [x0, x1], cz = [z0, z1]
  var i = 0
  while (i < 2) {
    var j = 0
    while (j < 2) {
      f(cx[i], py + 1, cz[j], cx[i], py + 7, cz[j], 'minecraft:oak_log')
      j = j + 1
    }
    i = i + 1
  }

  // ---- 一层南立面：整排落地玻璃 + 中间门 ----
  f(x0 + 1, py + 1, z1, x1 - 1, py + 3, z1, 'minecraft:glass')
  // 门洞（2 宽 2 高）+ 铁门
  f(px - 1, py + 1, z1, px, py + 2, z1, 'minecraft:air')
  s(px - 1, py + 1, z1, 'minecraft:iron_door[half=lower,facing=north]')
  s(px - 1, py + 2, z1, 'minecraft:iron_door[half=upper,facing=north]')
  s(px, py + 1, z1, 'minecraft:iron_door[half=lower,facing=north]')
  s(px, py + 2, z1, 'minecraft:iron_door[half=upper,facing=north]')
  // 玻璃竖框（避开门）
  var mx = x0 + 2
  while (mx <= x1 - 2) {
    if (mx < px - 1 || mx > px) f(mx, py + 1, z1, mx, py + 3, z1, 'minecraft:stripped_oak_log')
    mx = mx + 4
  }
  // 一层北墙高窗带
  f(px - 8, py + 2, z0, px + 8, py + 3, z0, 'minecraft:glass')
  // 一层东/西墙窗带
  f(x1, py + 2, pz - 2, x1, py + 3, pz + 4, 'minecraft:glass')
  f(x0, py + 2, pz - 2, x0, py + 3, pz + 4, 'minecraft:glass')

  // ---- 二层南立面：整排落地玻璃 + 阳台门 ----
  f(x0 + 1, py + 5, z1, x1 - 1, py + 7, z1, 'minecraft:glass')
  f(px - 1, py + 5, z1, px, py + 6, z1, 'minecraft:air')
  s(px - 1, py + 5, z1, 'minecraft:oak_door[half=lower,facing=north]')
  s(px - 1, py + 6, z1, 'minecraft:oak_door[half=upper,facing=north]')
  s(px, py + 5, z1, 'minecraft:oak_door[half=lower,facing=north]')
  s(px, py + 6, z1, 'minecraft:oak_door[half=upper,facing=north]')
  var mx2 = x0 + 2
  while (mx2 <= x1 - 2) {
    if (mx2 < px - 1 || mx2 > px) f(mx2, py + 5, z1, mx2, py + 7, z1, 'minecraft:stripped_oak_log')
    mx2 = mx2 + 4
  }
  // 二层北墙高窗带
  f(px - 8, py + 6, z0, px + 8, py + 7, z0, 'minecraft:glass')
  // 二层东/西墙窗带
  f(x1, py + 6, pz - 2, x1, py + 7, pz + 4, 'minecraft:glass')
  f(x0, py + 6, pz - 2, x0, py + 7, pz + 4, 'minecraft:glass')

  // ---- 二层南向阳台（露台）----
  f(px - 4, py + 4, z1 + 1, px + 4, py + 4, z1 + 3, 'minecraft:smooth_quartz')
  f(px - 4, py + 5, z1 + 3, px + 4, py + 5, z1 + 3, 'minecraft:oak_fence')
  f(px - 4, py + 5, z1 + 1, px - 4, py + 5, z1 + 3, 'minecraft:oak_fence')
  f(px + 4, py + 5, z1 + 1, px + 4, py + 5, z1 + 3, 'minecraft:oak_fence')
  s(px - 4, py + 5, z1 + 1, 'minecraft:sea_lantern')
  s(px + 4, py + 5, z1 + 1, 'minecraft:sea_lantern')
}

// ---------- 台阶楼梯（东侧楼梯间，南→北上行，2 宽，上方 3 格无阻挡） ----------
// 8 级台阶，每级升 0.5 格，共升 4 格（一层脚底 py+1 → 二层脚底 py+5）
function mkHomeStairs(env) {
  var f = env.fill
  var px = env.px, py = env.py, pz = env.pz
  // 先挖掉二楼楼板（台阶上方通道，z = pz+4 .. pz-2 共 7 列，对应第 0~6 级）
  f(px + 4, py + 4, pz + 4, px + 5, py + 4, pz - 2, 'minecraft:air')
  // 台阶（2 宽 x = px+4..px+5，南→北）
  var k = 0
  while (k < 8) {
    var sz = pz + 4 - k
    var sy = py + 1 + Math.floor(k / 2)
    var half = (k % 2 == 0) ? 'bottom' : 'top'
    f(px + 4, sy, sz, px + 5, sy, sz, 'minecraft:smooth_quartz_slab[type=' + half + ']')
    k = k + 1
  }
  // 二层楼梯井护栏（东/西/南三侧，北侧为落地出口）
  f(px + 3, py + 5, pz - 2, px + 3, py + 5, pz + 4, 'minecraft:oak_fence')
  f(px + 6, py + 5, pz - 2, px + 6, py + 5, pz + 4, 'minecraft:oak_fence')
  f(px + 4, py + 5, pz + 3, px + 5, py + 5, pz + 3, 'minecraft:oak_fence')
}

// ---------- 门廊 + 门口道路 + 下山台阶（方便出行） ----------
function mkHomeRoad(env) {
  var f = env.fill, s = env.set
  var px = env.px, py = env.py, pz = env.pz, z1 = env.z1, gz1 = env.gz1
  // 门廊平台（7 宽）
  f(px - 3, py, z1 + 1, px + 3, py, z1 + 4, 'minecraft:smooth_quartz')
  // 道路（3 宽，到平台南缘）
  f(px - 1, py, z1 + 5, px + 1, py, gz1, 'minecraft:smooth_quartz')
  // 下山台阶（2 宽，向南下行 12 级，降 6 格）
  var k = 0
  while (k < 12) {
    var rz = gz1 + 1 + k
    var ry = py - Math.floor((k + 1) / 2)
    var half = (k % 2 == 0) ? 'bottom' : 'top'
    f(px - 1, ry + 1, rz, px, ry + 3, rz, 'minecraft:air') // 头顶清障
    f(px - 1, ry, rz, px, ry, rz, 'minecraft:smooth_quartz_slab[type=' + half + ']')
    k = k + 1
  }
  // 山脚小平台（3 宽）
  f(px - 1, py - 6, gz1 + 12, px + 1, py - 6, gz1 + 15, 'minecraft:smooth_quartz')
  // 沿路照明
  s(px - 2, py + 1, z1 + 2, 'minecraft:lantern')
  s(px + 2, py + 1, z1 + 2, 'minecraft:lantern')
  s(px - 2, py + 1, gz1, 'minecraft:lantern')
  s(px + 2, py + 1, gz1, 'minecraft:lantern')
}

// ---------- 红石科技：自动夜灯 + 自动门压力板 + 门铃 ----------
function mkHomeRedstone(env) {
  var s = env.set
  var px = env.px, py = env.py, pz = env.pz, z1 = env.z1, gz1 = env.gz1

  // 自动夜灯柱（倒置阳光传感器 + 红石灯）：夜里自动亮
  var posts = [[px - 4, pz + 10], [px + 4, pz + 10], [px - 2, pz + 15], [px + 2, pz + 15], [px - 11, pz - 8], [px + 11, pz - 8], [px - 11, pz + 8], [px + 11, pz + 8]]
  var i = 0
  while (i < posts.length) {
    s(posts[i][0], py + 1, posts[i][1], 'minecraft:oak_fence')
    s(posts[i][0], py + 2, posts[i][1], 'minecraft:redstone_lamp')
    s(posts[i][0], py + 3, posts[i][1], 'minecraft:daylight_detector[inverted=true]')
    i = i + 1
  }

  // 自动正门（压力板，内外各 2 块）
  s(px - 1, py + 1, z1 - 1, 'minecraft:stone_pressure_plate')
  s(px, py + 1, z1 - 1, 'minecraft:stone_pressure_plate')
  s(px - 1, py + 1, z1 + 1, 'minecraft:stone_pressure_plate')
  s(px, py + 1, z1 + 1, 'minecraft:stone_pressure_plate')

  // 门铃（压力板 + 音符盒）
  s(px + 2, py + 1, z1 + 1, 'minecraft:stone_pressure_plate')
  s(px + 2, py + 1, z1 + 2, 'minecraft:note_block[note=12]')
}

// ---------- 总装 ----------
function buildHome(server, p) {
  var env = mkHomeMakeEnv(server, p)

  mkHomeBase(env)     // 1 地基
  mkHomeShell(env)    // 2 外壳
  mkHomeStairs(env)   // 3 楼梯
  if (global.mkHomeArmory) global.mkHomeArmory(env)   // 4 地下武库
  if (global.mkHomeFirst) global.mkHomeFirst(env)     // 5 一层室内
  if (global.mkHomeSecond) global.mkHomeSecond(env)   // 6 二层室内
  if (global.mkHomeCourt) global.mkHomeCourt(env)     // 7 庭院
  mkHomeRoad(env)     // 8 门廊道路
  mkHomeRedstone(env) // 9 红石

  server.runCommandSilent(`setworldspawn ${env.px} ${env.f1} ${env.pz + 4}`)
  server.runCommandSilent(`tp ${p.username} ${env.px} ${env.f1} ${env.pz + 4}`)
  server.runCommandSilent(`effect give ${p.username} minecraft:instant_health 1 4 true`)
  server.tell(`§b别墅重建完成：台阶楼梯 / 海晶灯武库 / 三层分间 / 自动夜灯红石，庭院带田地·草地·泳池·下山路。`)
}

PlayerEvents.loggedIn(event => {
  var p = event.player
  if (p.persistentData.contains('mk_home')) return
  var s = event.server
  var gt = 0
  try { gt = s.runCommandSilent('time query gametime') } catch (e) { gt = 0 }
  if (gt < 200) {
    p.persistentData.putString('mk_home', 'on')
    buildHome(s, p)
  } else {
    p.tell('§7这个存档已经有年头了。想要开局别墅：Esc → 对局域网开放 → 允许作弊，然后敲 /mkhome；或者干脆开个新世界。')
  }
})

ServerEvents.commandRegistry(event => {
  var Commands = event.commands
  event.register(Commands.literal('mkhome').executes(ctx => {
    var player = ctx.source.player
    if (!player) return 0
    buildHome(ctx.source.server, player)
    return 1
  }))
})
