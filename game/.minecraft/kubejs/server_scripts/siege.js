// ===== 定期围城：每 3 个游戏日，从重生点 30 格处刷高级突变体与首领，向重生点/玩家推进 =====
// 用法：/mksiege start [波数]   /mksiege stop   /mksiege status   /mksiege now
let siege = { active: false, wave: 0, maxWaves: 5, timer: 0, spawn: null, maxCount: 1 }
let lastAutoDay = -1

// ---- 实时剩余数量：Boss 条 + 动作栏 ----
function countRaiders(server) {
  try {
    c(server, 'scoreboard objectives add mk_count dummy')
    c(server, 'execute store result score #raid mk_count run execute if entity @e[tag=mk_raid]')
    const n = server.runCommandSilent('scoreboard players get #raid mk_count')
    return (typeof n === 'number' && n > 0) ? n : 0
  } catch (e) { return 0 }
}

function barSetup(server) {
  c(server, 'bossbar remove mk_raid')
  c(server, 'bossbar add mk_raid {"text":"围城","color":"red"}')
  c(server, 'bossbar set mk_raid color red')
  c(server, 'bossbar set mk_raid overlay progress')
  c(server, 'bossbar set mk_raid players @a')
}

function updateBar(server) {
  const n = countRaiders(server)
  if (n > siege.maxCount) siege.maxCount = n
  c(server, `bossbar set mk_raid max ${Math.max(siege.maxCount, 1)}`)
  c(server, `bossbar set mk_raid value ${n}`)
  c(server, `bossbar set mk_raid name {"text":"围城 · 第 ${siege.wave}/${siege.maxWaves} 波 · 剩余 ${n} 只","color":"red"}`)
  c(server, `title @a actionbar {"text":"剩余 ${n} 只","color":"red"}`)
  return n
}

function c(server, s) { server.runCommandSilent(s) }

// 重生点：优先床，其次世界出生点，取不到就退回玩家脚下
function posOf(bp) {
  if (!bp) return null
  try {
    const x = (typeof bp.getX === 'function') ? bp.getX() : bp.x
    const y = (typeof bp.getY === 'function') ? bp.getY() : bp.y
    const z = (typeof bp.getZ === 'function') ? bp.getZ() : bp.z
    if (typeof x === 'number' && typeof y === 'number' && typeof z === 'number' && isFinite(x) && isFinite(y) && isFinite(z)) {
      return { x: x + 0.5, y: y + 1, z: z + 0.5 }
    }
  } catch (e) { }
  return null
}

function respawnPos(server, player) {
  try {
    const rp = posOf(player.getRespawnPosition())
    if (rp) return rp
  } catch (e) { }
  try {
    const ss = posOf(server.overworld().getSharedSpawnPos())
    if (ss) return ss
  } catch (e) { }
  return { x: player.x, y: player.y, z: player.z }
}

// 不召唤 Cataclysm 的结构 Boss：它们在野外会停在待机形态，打不动、也删不掉。
// 末波改用强化突变体当「头目」，能打、会跟、结束会被一并清掉。
const ELITE_NBT = ',CustomName:\'{"text":"牧犬头目","color":"dark_red"}\',CustomNameVisible:1b,' +
  'Attributes:[{Name:"generic.max_health",Base:300.0}],Health:300.0f'

function summonAt(server, type, x, y, z, tag, extra) {
  const cmd = `summon ${type} ${Math.round(x)} ${Math.round(y)} ${Math.round(z)} {Tags:["${tag}"],PersistenceRequired:1b${extra || ''}}`
  const r = server.runCommandSilent(cmd)
  if (!r) console.info('[mk-siege] summon failed: ' + cmd)
  return r
}

function spawnWave(server, sp, wave, maxWaves) {
  const count = Math.min(8 + wave * 4, 34)
  console.info('[mk-siege] wave ' + wave + ' center ' + sp.x + ',' + sp.y + ',' + sp.z + ' types=' + (typeof sp.x) + '/' + (typeof sp.y) + '/' + (typeof sp.z) + ' count ' + count)
  c(server, 'title @a times 5 45 10')
  c(server, `title @a title {"text":"第 ${wave} 波","color":"red","bold":true}`)
  c(server, `title @a subtitle {"text":"${count} 只高级突变体从 30 格左右压过来","color":"gray"}`)
  c(server, 'playsound minecraft:entity.ravager.roar master @a ~ ~ ~ 1 0.8')

  let okCount = 0
  const bx = Number(sp.x) || 0
  const by = Number(sp.y) || 0
  const bz = Number(sp.z) || 0
  const OFFS = [[30, 0], [21, 21], [0, 30], [-21, 21], [-30, 0], [-21, -21], [0, -30], [21, -21],
                [26, 15], [-26, 15], [26, -15], [-26, -15], [15, 26], [-15, 26], [15, -26], [-15, -26]]
  for (let i = 0; i < count; i++) {
    const o = OFFS[i % OFFS.length]
    const x = bx + o[0]
    const z = bz + o[1]
    const y = by + 6 + (i % 4) * 5
    const t = (i % 5 === 0) ? 'mutantmonsters:mutant_skeleton' : 'mutantmonsters:mutant_zombie'
    if (summonAt(server, t, x, y, z, 'mk_raid')) okCount++
  }
  console.info('[mk-siege] wave ' + wave + ' summoned ' + okCount + '/' + count)

  // 最后一波加一个精英头目（强化突变体：能打、会追、结束会被一并清掉）
  if (wave >= maxWaves) {
    if (summonAt(server, 'mutantmonsters:mutant_zombie', bx + 30, by + 2, bz, 'mk_raid', ELITE_NBT)) okCount++
    console.info('[mk-siege] elite spawned at ' + Math.round(bx + 30) + ',' + Math.round(by + 2) + ',' + Math.round(bz))
    c(server, 'title @a subtitle {"text":"牧犬头目来了。","color":"dark_red","bold":true}')
    c(server, 'playsound minecraft:entity.wither.spawn master @a')
  }
}

function startSiege(server, player, waves, reason) {
  let sp = respawnPos(server, player)
  const dx = Math.abs(sp.x - player.x), dz = Math.abs(sp.z - player.z)
  if (dx > 64 || dz > 64) {
    sp = { x: player.x, y: player.y, z: player.z }
    console.info('[mk-siege] respawn too far (' + Math.round(dx) + ',' + Math.round(dz) + '), spawn around player instead')
  }
  siege = { active: true, wave: 0, maxWaves: Math.max(1, Math.min(waves || 5, 10)), timer: 0, spawn: sp, maxCount: 1 }
  c(server, 'weather thunder 2400')
  c(server, 'time set night')
  c(server, 'title @a times 10 60 20')
  c(server, 'title @a title {"text":"围城","color":"red","bold":true}')
  c(server, `title @a subtitle {"text":"${reason || '牧犬循着血味来了'}——它们朝这里走。","color":"gray"}`)
  c(server, 'playsound minecraft:entity.wither.spawn master @a')
  barSetup(server)
  siege.wave = 1
  spawnWave(server, siege.spawn, 1, siege.maxWaves)
  updateBar(server)
  console.info('[mk-siege] raiders after wave 1: ' + countRaiders(server))
}

function stopSiege(server, msg) {
  c(server, 'bossbar remove mk_raid')
  c(server, 'kill @e[tag=mk_raid]')
  siege.active = false
  if (msg) server.tell(msg)
}

function statusText() {
  if (!siege.active) return '§7当前没有围城。'
  return `§e围城进行中：第 ${siege.wave}/${siege.maxWaves} 波，重生点 ${Math.round(siege.spawn.x)} ${Math.round(siege.spawn.y)} ${Math.round(siege.spawn.z)}`
}

// 每 10 秒检查一次：第 3、6、9… 个游戏日自动来
ServerEvents.tick(event => {
  const server = event.server
  if (server.tickCount % 200 === 0) {
    try {
      c(server, 'scoreboard objectives add mk_day dummy')
      c(server, 'execute store result score #day mk_day run time query day')
      const day = server.runCommandSilent('scoreboard players get #day mk_day')
      if (typeof day === 'number' && day > 0 && day % 3 === 0 && day !== lastAutoDay && !siege.active) {
        lastAutoDay = day
        let target = null
        for (const p of server.players) { target = p; break }
        if (target) {
          server.tell('§c第 ' + day + ' 天。牧犬又循着血味找上门了——重生点附近 30 格，守住。')
          startSiege(server, target, 5, '第 ' + day + ' 天的例行围城')
        }
      }
    } catch (e) { }
  }

  if (!siege.active) return
  if (server.tickCount % 20 !== 0) return
  siege.timer += 20

  // 每秒刷新一次剩余数量（Boss 条 + 动作栏）
  const left = updateBar(server)

  // 不管有没有仇恨，都朝重生点走
  const sx = siege.spawn.x, sy = siege.spawn.y, sz = siege.spawn.z
  c(server, `execute as @e[tag=mk_raid,distance=8..200] at @s run tp @s ^ ^ ^1.4 facing ${sx} ${sy} ${sz}`)

  // 靠近玩家 6 格内的直接啃一口，保证有压迫感
  c(server, 'execute as @e[tag=mk_raid,distance=..6] at @s run damage @a[distance=..6] 2 minecraft:mob_attack')

  // 45 秒一波
  if (siege.timer >= 900) {
    siege.timer = 0
    if (siege.wave < siege.maxWaves) {
      siege.wave++
      spawnWave(server, siege.spawn, siege.wave, siege.maxWaves)
      updateBar(server)
    } else {
      if (left <= 0) {
        c(server, 'title @a times 10 80 20')
        c(server, 'title @a title {"text":"守住了","color":"gold","bold":true}')
        c(server, 'title @a subtitle {"text":"这一夜过去了。","color":"white"}')
        stopSiege(server, '§a围城结束，地上的残骸留着做纪念。')
      }
    }
  }
})

ServerEvents.commandRegistry(event => {
  const { commands: Commands } = event
  event.register(Commands.literal('mksiege')
    .then(Commands.literal('start').executes(ctx => {
      const p = ctx.source.player
      if (!p) return 0
      startSiege(ctx.source.server, p, 5, '手动召唤')
      return 1
    }))
    .then(Commands.literal('now').executes(ctx => {
      const p = ctx.source.player
      if (!p) return 0
      startSiege(ctx.source.server, p, 5, '现在就打')
      return 1
    }))
    .then(Commands.literal('stop').executes(ctx => {
      stopSiege(ctx.source.server, '§a围城结束。')
      return 1
    }))
    .then(Commands.literal('status').executes(ctx => {
      ctx.source.player.tell(statusText())
      return 1
    }))
    .executes(ctx => {
      ctx.source.player.tell(statusText())
      return 1
    })
  )
})
