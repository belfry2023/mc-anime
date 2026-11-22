// ===== /mksiege —— 让原版 + mod 的敌对生物真的去打殖民地/村庄的居民 =====
// 原因：僵尸、骷髅、苦力怕这些原版怪的索敌目标写死为 net.minecraft.world.entity.npc.Villager，
//       而 MineColonies 的市民是 EntityCitizen、Millénaire 的居民是自定义 MillVillager，
//       都不继承 Villager → 原版怪根本"看不见"它们。
// 本脚本用 Mob.setTarget() 强行把最近的居民塞给附近的敌对生物，让 mod 怪也参与围城。
//
// 用法：
//   /mksiege           开关（默认关）
//   /mksiege on          开启（顺便把难度设为困难，怪才会砸门）
//   /mksiege off         关闭
//   /mksiege spawn [n]   在玩家周围刷一波 mod 怪（含突变怪/Cataclysm），n 默认 8
//   /mksiege status      查看状态
// 注意：新命令需要重启客户端才会注册。

var SIEGE_PERIOD = 20
var SIEGE_RADIUS = 40

var Monster = Java.loadClass('net.minecraft.world.entity.monster.Monster')
var MobBase = Java.loadClass('net.minecraft.world.entity.Mob')

function sieEnabled(server) {
  return server.persistentData.getBoolean('mkSiege')
}

// 被认为是"居民"的实体
function sieIsCitizen(e) {
  var t = String(e.type)
  if (t === 'minecolonies:citizen') return true
  if (t === 'minecraft:villager') return true
  if (t === 'guardvillagers:guard') return true
  if (t.indexOf('millenaire:') === 0) return true
  return false
}

function sieIsPlayer(e) {
  return String(e.type) === 'minecraft:player'
}

// 找出最近的居民
function sieNearestCitizen(mob, targets) {
  var best = null, bd = 1e9
  targets.forEach(function (c) {
    if (!c.isAlive() || c.isRemoved()) return
    try {
      var d = mob.distanceToEntity(c)
      if (d < bd) { bd = d; best = c }
    } catch (err) {}
  })
  return best
}

function sieTick(server) {
  if (!sieEnabled(server)) return
  server.players.forEach(function (p) {
    var level = p.level
    var list
    try { list = level.getEntitiesWithin(p.boundingBox.inflate(SIEGE_RADIUS)) } catch (err) { return }
    var targets = [], mobs = []
    list.forEach(function (e) {
      if (!e || e.isRemoved()) return
      if (sieIsCitizen(e)) { targets.push(e); return }
      if (sieIsPlayer(e)) return
      if (e instanceof Monster) mobs.push(e)
    })
    if (!targets.length || !mobs.length) return
    mobs.forEach(function (m) {
      if (!(m instanceof MobBase)) return
      var cur = m.getTarget()
      // 已经在打玩家的，保持原样（玩家自己也得挨打才有压迫感）
      if (cur && cur.isAlive() && !sieIsCitizen(cur) && cur !== m) {
        if (sieIsPlayer(cur)) return
      }
      var tgt = sieNearestCitizen(m, targets)
      if (!tgt) return
      try {
        m.setTarget(tgt)
        m.setPersistenceRequired()
      } catch (err) {}
    })
  })
}

var SIEGE_SPAWN = [
  'minecraft:zombie', 'minecraft:zombie', 'minecraft:skeleton', 'minecraft:pillager',
  'minecraft:vindicator', 'minecraft:witch', 'minecraft:ravager',
  'mutantmonsters:mutant_zombie', 'mutantmonsters:mutant_skeleton', 'mutantmonsters:mutant_creeper',
  'cataclysm:koboleton', 'cataclysm:the_watcher', 'cataclysm:the_prowler'
]

function sieSpawnWave(server, p, n) {
  var px = Math.floor(p.x), py = Math.floor(p.y), pz = Math.floor(p.z)
  var count = n || 8
  for (var i = 0; i < count; i++) {
    var id = SIEGE_SPAWN[i % SIEGE_SPAWN.length]
    var ang = (i / count) * Math.PI * 2
    var r = 12 + (i % 5) * 2
    var x = px + Math.round(Math.cos(ang) * r)
    var z = pz + Math.round(Math.sin(ang) * r)
    server.runCommandSilent('execute in ' + p.level.dimension + ' run summon ' + id + ' ' + x + ' ' + (py + 2) + ' ' + z)
    server.runCommandSilent('execute in ' + p.level.dimension + ' run tag @e[type=' + id + ',x=' + x + ',y=' + (py + 2) + ',z=' + z + ',distance=..2] add mk_siege')
  }
  p.tell('§c[围城] 已刷出 ' + count + ' 只进攻单位（含 mod 怪）。')
}

function sieStatus(server, p) {
  var on = sieEnabled(server)
  p.tell('§6[围城] 状态：§' + (on ? 'a已开启' : '7已关闭') + '§6，半径 ' + SIEGE_RADIUS + ' 格，每秒强制索敌一次。')
  if (on) p.tell('§7配合 /mkcolony raid 或夜晚袭击食用更佳；/mksiege spawn 可手动加波次。')
}

ServerEvents.commandRegistry(function (event) {
  var C = event.commands

  function playerOf(ctx) { return ctx.source.player }

  event.register(
    C.literal('mksiege')
      .then(C.literal('on').executes(function (ctx) {
        var p = playerOf(ctx); if (!p) return 0
        ctx.source.server.persistentData.putBoolean('mkSiege', true)
        ctx.source.server.runCommandSilent('difficulty hard')
        p.tell('§c[围城] 已开启：附近敌对生物会主动进攻市民/村民；难度已设为困难（僵尸会砸门）。')
        return 1
      }))
      .then(C.literal('off').executes(function (ctx) {
        var p = playerOf(ctx); if (!p) return 0
        ctx.source.server.persistentData.putBoolean('mkSiege', false)
        p.tell('§7[围城] 已关闭。')
        return 1
      }))
      .then(C.literal('status').executes(function (ctx) {
        var p = playerOf(ctx); if (!p) return 0
        sieStatus(ctx.source.server, p); return 1
      }))
      .then(C.literal('spawn').executes(function (ctx) {
        var p = playerOf(ctx); if (!p) return 0
        sieSpawnWave(ctx.source.server, p, 8); return 1
      }))
      .executes(function (ctx) {
        var p = playerOf(ctx); if (!p) return 0
        var server = ctx.source.server
        var on = !sieEnabled(server)
        server.persistentData.putBoolean('mkSiege', on)
        if (on) {
          server.runCommandSilent('difficulty hard')
          p.tell('§c[围城] 已开启：附近敌对生物会主动进攻市民/村民；难度已设为困难。')
        } else {
          p.tell('§7[围城] 已关闭。')
        }
        return 1
      })
  )
})

ServerEvents.tick(function (event) {
  var server = event.server
  if (server.tickCount % SIEGE_PERIOD !== 0) return
  try { sieTick(server) } catch (err) { console.info('[MKSIEGE] ' + err) }
})
