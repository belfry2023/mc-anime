// ===== /mkwar —— NPC 自动城防战（赛博斗蛐蛐） =====
// 用法：
//   /mkwar build        在你脚下建一座小型堡垒（城墙 / 四塔 / 城门 / 钟楼），并驻防守军
//   /mkwar start [波数] 攻城开始（默认 5 波），守军自动迎战
//   /mkwar stop         清场
//   /mkwar status       看状态
//
// 玩法：守军 = 村民 + 铁傀儡 + 雪傀儡（原版 AI 会自动索敌开打），
//       攻军 = 僵尸/骷髅/掠夺者/卫道士/劫掠兽/突变体，从城外一圈圈压上来。
//       你只需要站到高处看戏。

var war = { active: false, wave: 0, maxWaves: 5, timer: 0, cx: 0, cy: 0, cz: 0, phase: 'idle' }

function wc(server, s) { server.runCommandSilent(s) }

function warCount(server, tag) {
  try {
    wc(server, 'scoreboard objectives add mkwar_count dummy')
    wc(server, 'execute store result score #mkwar mkwar_count run execute if entity @e[tag=' + tag + ']')
    var n = server.runCommandSilent('scoreboard players get #mkwar mkwar_count')
    return (typeof n === 'number' && n > 0) ? n : 0
  } catch (err) { return 0 }
}

function warSummon(server, type, x, y, z, tag) {
  var cmd = 'summon ' + type + ' ' + Math.round(x) + ' ' + Math.round(y) + ' ' + Math.round(z) +
    ' {Tags:["' + tag + '"],PersistenceRequired:1b}'
  return server.runCommandSilent(cmd)
}

function warBarSetup(server) {
  wc(server, 'bossbar remove mk_war')
  wc(server, 'bossbar add mk_war {"text":"城防战","color":"red"}')
  wc(server, 'bossbar set mk_war color red')
  wc(server, 'bossbar set mk_war overlay progress')
  wc(server, 'bossbar set mk_war players @a')
}

function warBarUpdate(server) {
  var blue = warCount(server, 'mk_blue')
  var red = warCount(server, 'mk_red')
  var max = Math.max(blue + red, 1)
  wc(server, 'bossbar set mk_war max ' + max)
  wc(server, 'bossbar set mk_war value ' + Math.max(blue, 0))
  wc(server, 'bossbar set mk_war name {"text":"第 ' + war.wave + '/' + war.maxWaves + ' 波 · 守军 ' + blue + ' · 敌军 ' + red + '","color":"gold"}')
  return red
}

// ---- 建堡垒 ----
function warBuild(server, p) {
  var px = Math.floor(p.x)
  var py = Math.floor(p.y)
  var pz = Math.floor(p.z)
  var R = 11

  // 清场地
  wc(server, 'fill ' + (px - R - 3) + ' ' + (py + 1) + ' ' + (pz - R - 3) + ' ' + (px + R + 3) + ' ' + (py + 12) + ' ' + (pz + R + 3) + ' air')
  // 地基
  wc(server, 'fill ' + (px - R - 2) + ' ' + py + ' ' + (pz - R - 2) + ' ' + (px + R + 2) + ' ' + py + ' ' + (pz + R + 2) + ' polished_andesite')

  // 四面城墙（高 4，带城垛）
  var wall = 'stone_bricks'
  wc(server, 'fill ' + (px - R) + ' ' + (py + 1) + ' ' + (pz - R) + ' ' + (px + R) + ' ' + (py + 4) + ' ' + (pz - R) + ' ' + wall)
  wc(server, 'fill ' + (px - R) + ' ' + (py + 1) + ' ' + (pz + R) + ' ' + (px + R) + ' ' + (py + 4) + ' ' + (pz + R) + ' ' + wall)
  wc(server, 'fill ' + (px - R) + ' ' + (py + 1) + ' ' + (pz - R) + ' ' + (px - R) + ' ' + (py + 4) + ' ' + (pz + R) + ' ' + wall)
  wc(server, 'fill ' + (px + R) + ' ' + (py + 1) + ' ' + (pz - R) + ' ' + (px + R) + ' ' + (py + 4) + ' ' + (pz + R) + ' ' + wall)
  // 城垛
  wc(server, 'fill ' + (px - R) + ' ' + (py + 5) + ' ' + (pz - R) + ' ' + (px + R) + ' ' + (py + 5) + ' ' + (pz - R) + ' stone_brick_wall')
  wc(server, 'fill ' + (px - R) + ' ' + (py + 5) + ' ' + (pz + R) + ' ' + (px + R) + ' ' + (py + 5) + ' ' + (pz + R) + ' stone_brick_wall')
  wc(server, 'fill ' + (px - R) + ' ' + (py + 5) + ' ' + (pz - R) + ' ' + (px - R) + ' ' + (py + 5) + ' ' + (pz + R) + ' stone_brick_wall')
  wc(server, 'fill ' + (px + R) + ' ' + (py + 5) + ' ' + (pz - R) + ' ' + (px + R) + ' ' + (py + 5) + ' ' + (pz + R) + ' stone_brick_wall')

  // 南门（3 宽 3 高）
  wc(server, 'fill ' + (px - 1) + ' ' + (py + 1) + ' ' + (pz + R) + ' ' + (px + 1) + ' ' + (py + 3) + ' ' + (pz + R) + ' air')
  wc(server, 'setblock ' + (px - 1) + ' ' + (py + 4) + ' ' + (pz + R) + ' chiseled_stone_bricks')
  wc(server, 'setblock ' + (px + 1) + ' ' + (py + 4) + ' ' + (pz + R) + ' chiseled_stone_bricks')

  // 四角塔
  var corners = [[-R, -R], [R, -R], [-R, R], [R, R]]
  corners.forEach(function (o) {
    var x = px + o[0], z = pz + o[1]
    wc(server, 'fill ' + (x - 2) + ' ' + (py + 1) + ' ' + (z - 2) + ' ' + (x + 2) + ' ' + (py + 8) + ' ' + (z + 2) + ' stone_bricks')
    wc(server, 'fill ' + (x - 1) + ' ' + (py + 1) + ' ' + (z - 1) + ' ' + (x + 1) + ' ' + (py + 7) + ' ' + (z + 1) + ' air')
    wc(server, 'fill ' + (x - 2) + ' ' + (py + 9) + ' ' + (z - 2) + ' ' + (x + 2) + ' ' + (py + 9) + ' ' + (z + 2) + ' dark_oak_slab')
    wc(server, 'setblock ' + x + ' ' + (py + 10) + ' ' + z + ' lantern')
  })

  // 钟楼（中心）
  wc(server, 'fill ' + (px - 1) + ' ' + (py + 1) + ' ' + (pz - 1) + ' ' + (px + 1) + ' ' + (py + 6) + ' ' + (pz + 1) + ' stone_bricks')
  wc(server, 'fill ' + (px) + ' ' + (py + 2) + ' ' + (pz) + ' ' + (px) + ' ' + (py + 5) + ' ' + (pz) + ' air')
  wc(server, 'setblock ' + px + ' ' + (py + 3) + ' ' + pz + ' bell')
  wc(server, 'setblock ' + px + ' ' + (py + 7) + ' ' + pz + ' sea_lantern')

  // 守军：村民 + 铁傀儡 + 雪傀儡
  for (var i = 0; i < 8; i++) {
    var a = (i / 8) * Math.PI * 2
    warSummon(server, 'minecraft:villager', px + Math.cos(a) * 6, py + 1, pz + Math.sin(a) * 6, 'mk_blue')
  }
  for (var g = 0; g < 4; g++) {
    var ga = (g / 4) * Math.PI * 2 + 0.4
    warSummon(server, 'minecraft:iron_golem', px + Math.cos(ga) * 8, py + 1, pz + Math.sin(ga) * 8, 'mk_blue')
  }
  warSummon(server, 'minecraft:snow_golem', px - 7, py + 1, pz - 7, 'mk_blue')
  warSummon(server, 'minecraft:snow_golem', px + 7, py + 1, pz - 7, 'mk_blue')

  war.cx = px
  war.cy = py
  war.cz = pz

  server.tell('§a[城防战] 堡垒建好了：8 村民 + 4 铁傀儡 + 2 雪傀儡驻守，南面开城门。')
  server.tell('§7站到城墙上（或塔顶）看戏，输入 §e/mkwar start 5 §7开始攻城。')
}

// ---- 刷怪波次 ----
function warSpawnWave(server, wave) {
  var count = Math.min(6 + wave * 3, 24)
  var R = 17
  wc(server, 'title @a times 10 50 20')
  wc(server, 'title @a title {"text":"第 ' + wave + ' 波","color":"red","bold":true}')
  wc(server, 'playsound minecraft:entity.ravager.roar master @a ~ ~ ~ 1 0.9')

  for (var i = 0; i < count; i++) {
    var a = (i / count) * Math.PI * 2
    var x = war.cx + Math.cos(a) * R
    var z = war.cz + Math.sin(a) * R
    var y = war.cy + 1
    var t = 'minecraft:zombie'
    if (wave >= 2 && i % 6 === 1) t = 'minecraft:skeleton'
    if (wave >= 3 && i % 6 === 2) t = 'minecraft:pillager'
    if (wave >= 3 && i % 6 === 3) t = 'minecraft:vindicator'
    if (wave >= 4 && i % 7 === 4) t = 'minecraft:witch'
    if (wave >= 4 && i % 9 === 5) t = 'minecraft:ravager'
    if (wave >= 5 && i % 12 === 6) t = 'mutantmonsters:mutant_zombie'
    warSummon(server, t, x, y, z, 'mk_red')
  }

  // 攻城锤：把敌人朝城里赶
  wc(server, 'title @a subtitle {"text":"' + count + ' 只从城外压上来","color":"gray"}')
}

function warStart(server, p, waves) {
  war.active = true
  war.wave = 1
  war.maxWaves = Math.max(1, Math.min(waves || 5, 10))
  war.timer = 0
  war.phase = 'fight'
  if (!war.cx && !war.cz) { war.cx = Math.floor(p.x); war.cy = Math.floor(p.y); war.cz = Math.floor(p.z) }
  wc(server, 'time set night')
  wc(server, 'weather thunder 2400')
  warBarSetup(server)
  warSpawnWave(server, 1)
  warBarUpdate(server)
  server.tell('§c[城防战] 攻城开始！守军会自动迎战，你只需要看。')
}

function warStop(server, msg) {
  wc(server, 'bossbar remove mk_war')
  wc(server, 'kill @e[tag=mk_red]')
  wc(server, 'kill @e[tag=mk_blue]')
  war.active = false
  war.wave = 0
  war.phase = 'idle'
  if (msg) server.tell(msg)
}

ServerEvents.tick(function (event) {
  if (!war.active) return
  var server = event.server
  if (server.tickCount % 20 !== 0) return
  war.timer += 20

  // 把攻城部队往城门方向推，避免它们卡在树后
  wc(server, 'execute as @e[tag=mk_red,distance=6..200] at @s run tp @s ^ ^ ^1.0 facing ' + war.cx + ' ' + war.cy + ' ' + war.cz)

  var red = warBarUpdate(server)
  var blue = warCount(server, 'mk_blue')

  // 守军打光了 —— 城破
  if (blue <= 0) {
    wc(server, 'title @a times 10 80 30')
    wc(server, 'title @a title {"text":"城破了","color":"dark_red","bold":true}')
    wc(server, 'title @a subtitle {"text":"守军全灭","color":"red"}')
    server.tell('§4[城防战] 城破了。§7用 /mkwar stop 收场，或再多派守军。')
    war.active = false
    wc(server, 'bossbar remove mk_war')
    return
  }

  // 本波清空 → 下一波（缓冲 5 秒）
  if (red <= 0 && war.phase === 'fight' && war.timer >= 100) {
    war.timer = 0
    if (war.wave < war.maxWaves) {
      war.wave += 1
      warSpawnWave(server, war.wave)
    } else {
      war.active = false
      wc(server, 'bossbar remove mk_war')
      wc(server, 'title @a times 10 100 30')
      wc(server, 'title @a title {"text":"守住了","color":"gold","bold":true}')
      wc(server, 'title @a subtitle {"text":"守军还剩 ' + blue + ' 人","color":"white"}')
      server.tell('§6[城防战] 全部 ' + war.maxWaves + ' 波守住了，守军幸存 ' + blue + ' 个单位。')
    }
  }
})

ServerEvents.commandRegistry(function (event) {
  var C = event.commands

  function playerOf(ctx) { return ctx.source.player }

  event.register(
    C.literal('mkwar')
      .then(C.literal('build').executes(function (ctx) {
        var p = playerOf(ctx)
        if (!p) return 0
        warBuild(ctx.source.server, p)
        return 1
      }))
      .then(C.literal('start').executes(function (ctx) {
        var p = playerOf(ctx)
        if (!p) return 0
        warStart(ctx.source.server, p, 5)
        return 1
      }))
      .then(C.literal('stop').executes(function (ctx) {
        warStop(ctx.source.server, '§a[城防战] 已清场。')
        return 1
      }))
      .then(C.literal('status').executes(function (ctx) {
        var p = playerOf(ctx)
        if (!p) return 0
        if (!war.active) { p.tell('§7[城防战] 当前没有战斗。§e/mkwar build §7建堡垒。'); return 1 }
        p.tell('§e[城防战] 第 ' + war.wave + '/' + war.maxWaves + ' 波，中心 ' + war.cx + ' ' + war.cy + ' ' + war.cz)
        return 1
      }))
      .executes(function (ctx) {
        var p = playerOf(ctx)
        if (p) p.tell('§7用法：/mkwar build | start | stop | status')
        return 1
      })
  )
})
