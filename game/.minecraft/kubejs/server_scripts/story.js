// 剧情：被追杀的少女 · 序章
// 事件驱动，不需要玩家敲任何指令。
// stage: 0 未开始 / 1 待开演 / 2 追杀中 / 3 昏迷待带回家 / 4 复苏后派任务 / 5 完成

function run(server, cmd) {
  return server.runCommandSilent(cmd)
}

function tell(p, msg) {
  p.tell(msg)
}

function startChase(server, p) {
  const n = p.username
  // 清掉旧数据包留下的昏迷女仆，避免场上多一只雕像
  run(server, 'kill @e[type=touhou_little_maid:maid,tag=fainted_maid]')
  run(server, 'weather rain 900')
  run(server, 'time set midnight')
  run(server, 'playsound minecraft:entity.zombie.ambient hostile @a ~ ~ ~ 3 0.8')
  run(server, `execute at ${n} run summon touhou_little_maid:maid ^ ^ ^22 {CustomName:'{"text":"求救的少女","color":"red"}',CustomNameVisible:1b,NoAI:0b,Invulnerable:1b,Silent:1b,Health:8.0f,PersistenceRequired:1b,ModelId:"touhou_little_maid_spell:stellar_witch",Tags:["mk_girl"]}`)
  run(server, `execute as ${n} at @s run data modify entity @e[type=touhou_little_maid:maid,tag=mk_girl,sort=nearest,limit=1] Owner set from entity @s UUID`)
  run(server, 'effect give @e[type=touhou_little_maid:maid,tag=mk_girl,limit=1] minecraft:speed 60 2 true')

  for (let i = 0; i < 6; i++) {
    const dx = (i % 3) * 2 - 2
    const dz = 25 + Math.floor(i / 3) * 3
    run(server, `execute at ${n} run summon minecraft:zombie ^${dx} ^ ^${dz} {CustomName:'{"text":"追兵","color":"dark_red"}',PersistenceRequired:1b,Tags:["mk_chase"]}`)
  }

  run(server, 'title @a times 10 50 20')
  run(server, 'title @a title {"text":"救命——！","color":"red"}')
  run(server, 'title @a subtitle {"text":"林子那头，有人在跑。","color":"gray"}')
  tell(p, '§c林子那头有人在喊。追兵已经咬到她身后了——先救人。')
  tell(p, '§6（她塞给你的东西掉在脚边：一把 m107 和一箱弹药，别客气）')

  // 救她之前就得有家伙：给枪、弹药、护甲
  run(server, `give ${n} tacz:modern_kinetic_gun{GunId:"tacz:m107",GunCurrentAmmoCount:10,HasBulletInBarrel:1b} 1`)
  run(server, `give ${n} tacz:ammo{AmmoId:"tacz:50bmg"} 256`)
  run(server, `give ${n} minecraft:netherite_helmet{Enchantments:[{id:"minecraft:protection",lvl:4s},{id:"minecraft:unbreaking",lvl:3s}]} 1`)
  run(server, `give ${n} minecraft:netherite_chestplate{Enchantments:[{id:"minecraft:protection",lvl:4s},{id:"minecraft:unbreaking",lvl:3s}]} 1`)
  run(server, `give ${n} minecraft:netherite_leggings{Enchantments:[{id:"minecraft:protection",lvl:4s},{id:"minecraft:unbreaking",lvl:3s}]} 1`)
  run(server, `give ${n} minecraft:netherite_boots{Enchantments:[{id:"minecraft:protection",lvl:4s},{id:"minecraft:unbreaking",lvl:3s}]} 1`)
  run(server, `give ${n} minecraft:golden_apple 8`)

  p.persistentData.putInt('mk_stage', 2)
}

function collapse(server, p) {
  run(server, 'title @a times 10 60 20')
  run(server, 'title @a title {"text":"她撑不住了","color":"dark_red"}')
  run(server, 'title @a subtitle {"text":"倒在你脚边，气息很轻。","color":"gray"}')
  run(server, 'execute at @e[type=touhou_little_maid:maid,tag=mk_girl,limit=1] run particle minecraft:block redstone_block ~ ~0.3 ~ 0.4 0.3 0.4 0 20')
  run(server, 'playsound minecraft:entity.player.hurt hostile @a ~ ~ ~ 1 0.7')
  run(server, 'data merge entity @e[type=touhou_little_maid:maid,tag=mk_girl,limit=1] {NoAI:1b,Invulnerable:1b,Health:2.0f}')
  tell(p, '她倒下了。把她带回你床边，站在她旁边 4 格内就行，不用等夜里睡觉。')

  p.persistentData.putInt('mk_stage', 3)
}

// 玩家一躺上床，就把她安置在床边休养
function restAtBed(server, p) {
  const n = p.username
  run(server, `execute at ${n} run tp @e[type=touhou_little_maid:maid,tag=mk_girl,sort=nearest,limit=1] ~1 ~ ~`)
  run(server, 'data merge entity @e[type=touhou_little_maid:maid,tag=mk_girl,limit=1] {NoAI:1b,Invulnerable:1b,Silent:1b,Health:60.0f,CustomName:\'{"text":"魔法酒狐","color":"light_purple"}\'}')
  run(server, 'effect give @e[type=touhou_little_maid:maid,tag=mk_girl,limit=1] minecraft:regeneration 60 1 true')
  run(server, 'execute at @e[type=touhou_little_maid:maid,tag=mk_girl,limit=1] run particle minecraft:end_rod ~ ~1 ~ 0.3 0.5 0.3 0.02 20')
  tell(p, '你把她安置在床边。她的呼吸慢慢匀了下来。')

  p.persistentData.putInt('mk_stage', 4)
}

function wakeMaid(server, p) {
  const n = p.username
  run(server, 'data merge entity @e[type=touhou_little_maid:maid,tag=mk_girl,limit=1] {NoAI:0b,Invulnerable:0b,Health:300.0f}')
  run(server, 'attribute @e[type=touhou_little_maid:maid,tag=mk_girl,limit=1] minecraft:generic.max_health base set 300')
  run(server, 'attribute @e[type=touhou_little_maid:maid,tag=mk_girl,limit=1] minecraft:generic.armor base set 30')
  run(server, 'effect give @e[type=touhou_little_maid:maid,tag=mk_girl,limit=1] minecraft:resistance infinite 1 true')

  // 救她时掉的枪就是她给的；这里只补一个弹匣，不再发第二套武器
  run(server, `give ${n} tacz:ammo{AmmoId:"tacz:50bmg"} 128`)

  run(server, 'title @a times 10 60 20')
  run(server, 'title @a title {"text":"……你还在啊","color":"light_purple"}')
  run(server, 'title @a subtitle {"text":"她扶着床边站起来。","color":"gray"}')
  run(server, `playsound minecraft:entity.allay.ambient_with_item neutral @a ~ ~ ~ 1 1.2`)

  // 背景故事
  tell(p, '§d【她的来历】')
  tell(p, '「我叫魔法酒狐，不过你叫我小酒狐就行。」')
  tell(p, '「猎巫人烧了我的塔，理由是『魔力外泄』。真正的原因是我看见了不该看的东西——他们拿活人做容器。」')
  tell(p, '「他们把追兵叫『牧犬』。你刚才杀的那几只，只是最便宜的。」')
  tell(p, '「我现在动不了几下。想让我好起来，就陪着我——喂饭、让我干活、睡觉。女仆的情绪会长的。」')

  tell(p, '§6【养成期】§f先别急着出去。她需要 2 天时间把伤养回来。')
  tell(p, '提示：右键她可以安排工作（农场、采蜜之类）；让她在野餐垫上吃饭、作息排好睡觉，好感涨得最快。')
  tell(p, '她好起来之前，追兵随时可能再闻到味道。')

  p.persistentData.putInt('mk_day', run(server, 'time query day'))
  p.persistentData.putInt('mk_stage', 5)
}

const TIPS = [
  '§7【养成】右键她 → 工作模式，让她去种地或者采蜜，干活会攒好感。',
  '§7【养成】把食物放她主手/副手，她受伤或工作时会自己吃，好感+回血。',
  '§7【养成】日程表里给她排上「睡觉」，晚上她找女仆床躺下，好感涨得快。',
  '§7【养成】在野餐垫上陪她吃一顿，好感跳得比平时多。',
  '§7【养成】别让她死——死一次掉一大截好感。'
]

function growthTip(server, p) {
  const idx = p.persistentData.getInt('mk_tip') % TIPS.length
  tell(p, TIPS[idx])
  p.persistentData.putInt('mk_tip', idx + 1)
}

function raidIncoming(server, p) {
  const n = p.username
  run(server, 'weather rain 1200')
  run(server, 'time set night')
  run(server, 'title @a times 10 60 20')
  run(server, 'title @a title {"text":"他们找来了","color":"dark_red"}')
  run(server, 'title @a subtitle {"text":"雨里全是铁链的声音。","color":"gray"}')
  run(server, 'playsound minecraft:entity.ravager.roar hostile @a ~ ~ ~ 2 0.6')

  run(server, `execute at ${n} run summon minecraft:ravager ^4 ^ ^9 {CustomName:'{"text":"牧犬·头犬","color":"dark_red"}',PersistenceRequired:1b,Tags:["mk_raid"]}`)
  for (let i = 0; i < 5; i++) {
    const dx = (i % 3) * 3 - 3
    const dz = 8 + Math.floor(i / 3) * 3
    run(server, `execute at ${n} run summon minecraft:wither_skeleton ^${dx} ^ ^${dz} {CustomName:'{"text":"牧犬","color":"red"}',PersistenceRequired:1b,Tags:["mk_raid"]}`)
  }
  tell(p, '§c「牧犬」嗅到味道了。别让它们靠近房子。')
  p.persistentData.putInt('mk_stage', 6)
}

function finishQuest(server, p) {
  run(server, 'title @a times 10 60 20')
  run(server, 'title @a title {"text":"她记住了","color":"gold"}')
  run(server, 'title @a subtitle {"text":"不是那种写在纸上的记住。","color":"gray"}')
  run(server, 'execute at @e[type=touhou_little_maid:maid,tag=mk_girl,limit=1] run particle minecraft:end_rod ~ ~1 ~ 0.5 0.8 0.5 0.05 40')
  run(server, 'playsound minecraft:entity.player.levelup neutral @a ~ ~ ~ 1 1')
  tell(p, '「下界合金……你先留着。」她把锭推回你手里，「我还欠你一场仗。」')
  tell(p, '§d【第一章·完】§f契约的锁松了一点。她说下一步要去找「 furnace 底下的那间实验室」。')
  run(server, 'give ' + p.username + ' minecraft:diamond 16')
  run(server, 'give ' + p.username + ' tacz:ammo{AmmoId:"tacz:50bmg"} 128')

  p.persistentData.putInt('mk_stage', 8)
}

PlayerEvents.loggedIn(event => {
  const p = event.player

  if (!p.persistentData.contains('mk_stage')) {
    p.persistentData.putInt('mk_stage', 1)
    p.persistentData.putInt('mk_day0', run(event.server, 'time query day'))
    p.tell('§7风里有血腥味，但还远。先把日子过起来——两天之后，该来的会来。')
  }
})

ServerEvents.tick(event => {
  const server = event.server
  if (server.tickCount % 20 !== 0) return

  server.players.forEach(p => {
    const d = p.persistentData
    if (!d.contains('mk_stage')) return
    const stage = d.getInt('mk_stage')

    if (stage === 1) {
      // 开局先过两天日子，再让追杀找上门
      const day0 = d.contains('mk_day0') ? d.getInt('mk_day0') : 0
      const nowDay = run(server, 'time query day')
      if (nowDay - day0 >= 2) {
        startChase(server, p)
      } else if (server.tickCount % 2400 === 0) {
        tell(p, '§7风里有血腥味，还远。再撑两天。')
      }
    } else if (stage === 2) {
      // 周围追兵清空 → 她倒下
      const cleared = run(server, 'execute unless entity @e[type=minecraft:zombie,tag=mk_chase] run time query gametime')
      if (cleared > 0) {
        collapse(server, p)
      } else {
        run(server, 'execute at @e[type=touhou_little_maid:maid,tag=mk_girl,limit=1] run particle minecraft:block redstone_block ~ ~0.2 ~ 0.25 0.2 0.25 0 2')
      }
    } else if (stage === 3) {
      // 带她到床边、人站近一点（4 格内）就开始安置，不用非得睡觉/等到夜里
      const near = run(server, `execute at ${p.username} run execute if entity @e[type=touhou_little_maid:maid,tag=mk_girl,distance=..4] run time query gametime`)
      if (near > 0) {
        restAtBed(server, p)
      }
    } else if (stage === 4) {
      // 安置后等她缓 15 秒再醒
      const w = d.getInt('mk_wait') + 1
      d.putInt('mk_wait', w)
      if (w >= 15) {
        d.putInt('mk_wait', 0)
        wakeMaid(server, p)
      }
    } else if (stage === 5) {
      // 养成期：满 2 个游戏日后，追兵来
      const now = run(server, 'time query day')
      const startDay = d.getInt('mk_day')
      if (now - startDay >= 2) {
        raidIncoming(server, p)
      } else if (server.tickCount % 1200 === 0) {
        growthTip(server, p)
      }
    } else if (stage === 6) {
      const cleared = run(server, 'execute unless entity @e[type=minecraft:ravager,tag=mk_raid] run execute unless entity @e[type=minecraft:wither_skeleton,tag=mk_raid] run time query gametime')
      if (cleared > 0) {
        run(server, 'title @a times 10 60 20')
        run(server, 'title @a title {"text":"暂时安静了","color":"green"}')
        run(server, `playsound minecraft:entity.player.levelup neutral @a ~ ~ ~ 1 1`)
        tell(p, '§a头犬倒下了。她盯着那具尸体看了很久，才开口：')
        tell(p, '「牧犬是拿活人改的。它们记得我的味道，也记得我逃出来的方向。」')
        tell(p, '「想彻底甩掉它们，得去下界弄一块下界合金——我要用它把契约的锁打开。」')
        p.persistentData.putInt('mk_stage', 7)
      }
    } else if (stage === 7) {
      const hasIngot = run(server, `execute if entity @a[name="${p.username}",nbt={Inventory:[{id:"minecraft:netherite_ingot"}]}] run time query gametime`)
      if (hasIngot > 0) finishQuest(server, p)
    } else if (stage >= 8 && stage <= 11) {
      chapter(server, p, stage)
    } else if (stage === 12) {
      ending(server, p)
    }
  })
})

// ===== 第二章之后：长线剧情 =====
function mkCount(server, cmd) {
  try { server.runCommandSilent('scoreboard objectives add mk_tmp dummy') } catch (e) {}
  try {
    server.runCommandSilent('execute store result score #mk mk_tmp run ' + cmd)
    return server.runCommandSilent('scoreboard players get #mk mk_tmp')
  } catch (e) { return 0 }
}

function countMaids(server) {
  return mkCount(server, 'execute if entity @e[type=touhou_little_maid:maid]')
}

function countItem(server, name, id) {
  return mkCount(server, 'clear ' + name + ' ' + id + ' 0')
}

function chapter(server, p, stage) {
  const d = p.persistentData

  if (stage === 8) {
    if (!d.contains('mk_ch2')) {
      d.putString('mk_ch2', 'on')
      run(server, 'title @a times 10 60 20')
      run(server, 'title @a title {"text":"第二章·火种","color":"gold"}')
      run(server, 'title @a subtitle {"text":"一个人守一座塔，迟早被围死","color":"gray"}')
      tell(p, '§6她靠在窗边，把枪拆了又装：')
      tell(p, '「牧犬不止一头。你一个人挡得住今晚，挡不住下个月。」')
      tell(p, '「去，招几个人回来。别都像我这么难伺候。」')
      tell(p, '§a目标：身边凑够 3 只女仆（右键地面放召唤蛋）')
      run(server, `give ${p.username} touhou_little_maid:maid_spawn_egg 2`)
      run(server, `give ${p.username} touhou_little_maid:maid_spawn_egg 1`)
    }
    if (countMaids(server) >= 3) {
      d.putInt('mk_stage', 9)
      run(server, 'title @a times 10 60 20')
      run(server, 'title @a title {"text":"塔里有了人声","color":"green"}')
      tell(p, '「……行吧。至少今晚的岗有人轮了。」')
    }
  } else if (stage === 9) {
    if (!d.contains('mk_ch3')) {
      d.putString('mk_ch3', 'on')
      run(server, 'title @a times 10 60 20')
      run(server, 'title @a title {"text":"第三章·血债","color":"dark_red"}')
      tell(p, '§c夜里的林子开始有动静。它们不急着冲，先围着，等你自己出错。')
      tell(p, '「牧犬靠猎犬嗅血味找门。把腐肉堆在塔外，能引开它们一阵——我需要 32 块。」')
      tell(p, '§a目标：带回 32 块腐肉（杀僵尸）')
    }
    if (countItem(server, p.username, 'minecraft:rotten_flesh') >= 32) {
      d.putInt('mk_stage', 10)
      run(server, 'title @a times 10 60 20')
      run(server, 'title @a title {"text":"血夜里没人睡着","color":"red"}')
      run(server, `give ${p.username} minecraft:iron_ingot 32`)
      run(server, `give ${p.username} minecraft:enchanted_golden_apple 4`)
      tell(p, '「你身上全是血。别洗，先记住这个味道。」')
      tell(p, '「它们退回去报信了。下一次来的，不会只是牧犬。」')
    }
  } else if (stage === 10) {
    if (!d.contains('mk_ch4')) {
      d.putString('mk_ch4', 'on')
      run(server, 'title @a times 10 60 20')
      run(server, 'title @a title {"text":"第四章·巢穴","color":"dark_purple"}')
      tell(p, '§5西边半里地有座烧塌的瞭望塔。塔底不是地窖，是他们养东西的地方。')
      tell(p, '「牧犬管那东西叫『先驱』——拿活人喂出来的，胸口挂着一颗核，能挡子弹。」')
      tell(p, '「核里有一颗不死图腾。你去把塔底清出来，我在家等你。」')
      tell(p, '§a目标：下到塔底，杀掉『先驱』，带回不死图腾')
      buildLair(server, p)
    }
    if (mkCount(server, 'execute if entity @e[tag=mk_lair]') === 0) {
      d.putInt('mk_stage', 11)
      run(server, 'title @a times 10 60 20')
      run(server, 'title @a title {"text":"锁开了第一道","color":"green"}')
      run(server, `give ${p.username} minecraft:netherite_sword 1`)
      tell(p, '她拿过图腾，翻来覆去看了很久，才低声说：')
      tell(p, '「……你差点没回来。下次别这么干。」')
      tell(p, '「还剩最后一件事。末地。那条龙，是锁的最后一环。」')
    }
  } else if (stage === 11) {
    if (!d.contains('mk_ch5')) {
      d.putString('mk_ch5', 'on')
      run(server, 'title @a times 10 60 20')
      run(server, 'title @a title {"text":"第五章·屠龙","color":"dark_red"}')
      run(server, `give ${p.username} minecraft:ender_eye 12`)
      run(server, `give ${p.username} minecraft:bow 1`)
      run(server, `give ${p.username} minecraft:arrow 64`)
      tell(p, '「末地门开着。最后一件事——去把那条龙杀了。」')
      tell(p, '「我在这儿等。把龙蛋带回来。」')
      tell(p, '§a目标：击杀末影龙，带回龙蛋')
    }
    if (countItem(server, p.username, 'minecraft:dragon_egg') >= 1) {
      d.putInt('mk_stage', 12)
      run(server, 'title @a times 10 60 20')
      run(server, 'title @a title {"text":"终章·落地窗","color":"gold"}')
      tell(p, '她站在窗边，第一次没有背对着你。')
      tell(p, '「你确实不是个只会站在原地的废物。」')
      tell(p, '「……所以，这个家，你想装几个人？」')
      tell(p, '§e结局将按你身边的人数自动走向两个方向。')
    }
  }
}

function ending(server, p) {
  const maids = countMaids(server)
  if (maids >= 3) {
    run(server, 'title @a times 10 80 20')
    run(server, 'title @a title {"text":"结局 A·把家填满","color":"gold"}')
    run(server, 'title @a subtitle {"text":"塔里终于不安静了","color":"yellow"}')
    tell(p, '「这么多人，饭我一个人可做不过来。」她嘴上抱怨，锅还是端上来了。')
    tell(p, '窗外雪落下来，大厅里全是笑声。你的名字被喊了一遍又一遍。')
    run(server, `give ${p.username} touhou_little_maid:maid_spawn_egg 4`)
    run(server, `give ${p.username} minecraft:gold_block 64`)
  } else {
    run(server, 'title @a times 10 80 20')
    run(server, 'title @a title {"text":"结局 B·只留她","color":"light_purple"}')
    run(server, 'title @a subtitle {"text":"窗外的风声很大，屋里很静","color":"gray"}')
    tell(p, '「……就我们俩？也行。」她把枪靠在墙角，挨着你坐下。')
    tell(p, '「反正我也不擅长跟别人分。」')
    run(server, `give ${p.username} minecraft:diamond_block 32`)
  }
  p.persistentData.putInt('mk_stage', 13)
}

// ===== 调试命令：/mkstatus =====
ServerEvents.commandRegistry(event => {
  const { commands: Commands } = event
  event.register(Commands.literal('mkstatus').executes(ctx => {
    const player = ctx.source.player
    if (!player) return 0
    const d = player.persistentData
    let maids = 0
    try { maids = countMaids(ctx.source.server) } catch (e) {}
    player.tell('§e[mk] stage=' + d.getInt('mk_stage') + ' maids=' + maids + ' ch2=' + d.contains('mk_ch2') + ' ch3=' + d.contains('mk_ch3'))
    return 1
  }))
})
// ===== 第四章：在玩家东边 26 格搭一座废弃祭坛并放唤魔者 =====
function buildAltar(server, p) {
  const x = Math.floor(p.x) + 120
  const y = Math.floor(p.y)
  const z = Math.floor(p.z)

  // 地基 + 残墙
  server.runCommandSilent(`fill ${x - 5} ${y - 1} ${z - 5} ${x + 5} ${y} ${z + 5} minecraft:stone_bricks`)
  server.runCommandSilent(`fill ${x - 5} ${y + 1} ${z - 5} ${x + 5} ${y + 3} ${z - 5} minecraft:cracked_stone_bricks`)
  server.runCommandSilent(`fill ${x - 5} ${y + 1} ${z + 5} ${x + 5} ${y + 3} ${z + 5} minecraft:mossy_stone_bricks`)
  // 四根残柱
  server.runCommandSilent(`fill ${x - 5} ${y + 1} ${z - 5} ${x - 5} ${y + 4} ${z - 5} minecraft:cracked_stone_bricks`)
  server.runCommandSilent(`fill ${x + 5} ${y + 1} ${z - 5} ${x + 5} ${y + 4} ${z - 5} minecraft:cracked_stone_bricks`)
  server.runCommandSilent(`fill ${x - 5} ${y + 1} ${z + 5} ${x - 5} ${y + 4} ${z + 5} minecraft:mossy_stone_bricks`)
  server.runCommandSilent(`fill ${x + 5} ${y + 1} ${z + 5} ${x + 5} ${y + 4} ${z + 5} minecraft:mossy_stone_bricks`)
  // 中间石台 + 火 + 网
  server.runCommandSilent(`fill ${x - 1} ${y + 1} ${z - 1} ${x + 1} ${y + 2} ${z + 1} minecraft:stone_bricks`)
  server.runCommandSilent(`setblock ${x} ${y + 3} ${z} minecraft:soul_campfire`)
  server.runCommandSilent(`setblock ${x - 3} ${y + 2} ${z - 3} minecraft:cobweb`)
  server.runCommandSilent(`setblock ${x + 3} ${y + 2} ${z + 3} minecraft:cobweb`)
  server.runCommandSilent(`setblock ${x + 3} ${y + 2} ${z - 3} minecraft:cobweb`)
  server.runCommandSilent(`particle minecraft:soul_fire_flame ${x} ${y + 3} ${z} 1 0.5 1 0 20 normal`)

  // 唤魔者 + 卫道士
  server.runCommandSilent(`summon minecraft:evoker ${x + 2} ${y + 3} ${z + 2} {Tags:["mk_altar"],PersistenceRequired:1b}`)
  server.runCommandSilent(`summon minecraft:vindicator ${x - 2} ${y + 3} ${z + 2} {Tags:["mk_altar"],PersistenceRequired:1b}`)
  server.runCommandSilent(`summon minecraft:vindicator ${x + 1} ${y + 3} ${z - 2} {Tags:["mk_altar"],PersistenceRequired:1b}`)

  // 给一块指向祭坛的罗盘
  run(server, `give ${p.username} minecraft:compass{LodestonePos:{X:${x},Y:${y + 3},Z:${z}},LodestoneDimension:"minecraft:overworld",LodestoneTracked:0b,display:{Name:'{"text":"祭坛罗盘","color":"light_purple"}'}} 1`)
  tell(p, `§5祭坛在你东边大约一百二十格（坐标 ${x} ${y} ${z}），夜里能看见一点绿火。`)
  run(server, `playsound minecraft:block.soul_sand.step neutral @a ${x} ${y} ${z} 1 0.6`)
}
// ===== 手动搭祭坛：/mkaltar =====
ServerEvents.commandRegistry(event => {
  const { commands: Commands } = event
  event.register(Commands.literal('mkaltar').executes(ctx => {
    const player = ctx.source.player
    if (!player) return 0
    buildAltar(ctx.source.server, player)
    player.tell('§a祭坛搭好了，去东边看看。')
    return 1
  }))
})
// ===== 第四章场景：西边 150 格的塌塔 + 地下巢穴 + 先驱 =====
function buildLair(server, p) {
  const bx = Math.floor(p.x) - 150
  const by = Math.floor(p.y)
  const bz = Math.floor(p.z)
  const bottom = by - 12

  // 地面：塌了一半的瞭望塔
  server.runCommandSilent(`fill ${bx - 3} ${by - 1} ${bz - 3} ${bx + 3} ${by - 1} ${bz + 3} minecraft:cracked_stone_bricks`)
  server.runCommandSilent(`fill ${bx - 3} ${by} ${bz - 3} ${bx - 3} ${by + 5} ${bz - 3} minecraft:stone_bricks`)
  server.runCommandSilent(`fill ${bx + 3} ${by} ${bz - 3} ${bx + 3} ${by + 4} ${bz - 3} minecraft:mossy_stone_bricks`)
  server.runCommandSilent(`fill ${bx - 3} ${by} ${bz + 3} ${bx - 3} ${by + 3} ${bz + 3} minecraft:cracked_stone_bricks`)
  server.runCommandSilent(`fill ${bx - 2} ${by} ${bz - 3} ${bx + 2} ${by + 2} ${bz - 3} minecraft:stone_bricks`)
  server.runCommandSilent(`setblock ${bx} ${by + 1} ${bz} minecraft:campfire`)
  server.runCommandSilent(`setblock ${bx + 2} ${by + 5} ${bz} minecraft:chain`)
  server.runCommandSilent(`setblock ${bx - 2} ${by + 5} ${bz} minecraft:chain`)
  server.runCommandSilent(`particle minecraft:block minecraft:redstone_block ${bx} ${by + 1} ${bz} 3 1 3 0 30 normal`)

  // 竖井（脚手架可直接爬）
  server.runCommandSilent(`fill ${bx} ${by} ${bz} ${bx} ${by - 3} ${bz} minecraft:air`)
  server.runCommandSilent(`fill ${bx} ${by - 1} ${bz} ${bx} ${bottom + 1} ${bz} minecraft:scaffolding`)

  // 地下大厅
  server.runCommandSilent(`fill ${bx - 9} ${bottom - 1} ${bz - 9} ${bx + 9} ${bottom + 7} ${bz + 9} minecraft:air`)
  server.runCommandSilent(`fill ${bx - 9} ${bottom - 1} ${bz - 9} ${bx + 9} ${bottom - 1} ${bz + 9} minecraft:polished_deepslate`)
  server.runCommandSilent(`fill ${bx - 9} ${bottom + 7} ${bz - 9} ${bx + 9} ${bottom + 7} ${bz + 9} minecraft:deepslate_tiles`)
  server.runCommandSilent(`fill ${bx - 9} ${bottom} ${bz - 9} ${bx + 9} ${bottom + 6} ${bz - 9} minecraft:deepslate_bricks`)
  server.runCommandSilent(`fill ${bx - 9} ${bottom} ${bz + 9} ${bx + 9} ${bottom + 6} ${bz + 9} minecraft:deepslate_bricks`)
  server.runCommandSilent(`fill ${bx - 9} ${bottom} ${bz - 9} ${bx - 9} ${bottom + 6} ${bz + 9} minecraft:deepslate_bricks`)
  server.runCommandSilent(`fill ${bx + 9} ${bottom} ${bz - 9} ${bx + 9} ${bottom + 6} ${bz + 9} minecraft:deepslate_bricks`)

  // 中央台 + 灵魂火
  server.runCommandSilent(`fill ${bx - 2} ${bottom} ${bz - 2} ${bx + 2} ${bottom + 1} ${bz + 2} minecraft:polished_blackstone_bricks`)
  server.runCommandSilent(`setblock ${bx} ${bottom + 2} ${bz} minecraft:soul_fire`)

  // 四个铁笼，里面是“饲料”
  for (const o of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) {
    server.runCommandSilent(`fill ${bx + o[0] - 1} ${bottom} ${bz + o[1] - 1} ${bx + o[0] + 1} ${bottom + 2} ${bz + o[1] + 1} minecraft:iron_bars hollow`)
    server.runCommandSilent(`summon minecraft:husk ${bx + o[0]} ${bottom} ${bz + o[1]} {Tags:["mk_cage"],PersistenceRequired:1b,Silent:1b}`)
  }

  // 灯与网
  server.runCommandSilent(`setblock ${bx - 7} ${bottom + 5} ${bz - 7} minecraft:lantern`)
  server.runCommandSilent(`setblock ${bx + 7} ${bottom + 5} ${bz - 7} minecraft:lantern`)
  server.runCommandSilent(`setblock ${bx - 7} ${bottom + 5} ${bz + 7} minecraft:lantern`)
  server.runCommandSilent(`setblock ${bx + 7} ${bottom + 5} ${bz + 7} minecraft:lantern`)
  server.runCommandSilent(`setblock ${bx + 5} ${bottom + 3} ${bz - 5} minecraft:cobweb`)
  server.runCommandSilent(`setblock ${bx - 5} ${bottom + 3} ${bz + 5} minecraft:cobweb`)

  // 先驱与两名牧犬
  server.runCommandSilent(`summon cataclysm:the_harbinger ${bx} ${bottom + 2} ${bz} {Tags:["mk_lair"],PersistenceRequired:1b}`)
  server.runCommandSilent(`summon minecraft:vindicator ${bx + 4} ${bottom} ${bz + 2} {Tags:["mk_lair"],PersistenceRequired:1b}`)
  server.runCommandSilent(`summon minecraft:pillager ${bx - 4} ${bottom} ${bz - 2} {Tags:["mk_lair"],PersistenceRequired:1b}`)

  // 指路罗盘
  run(server, `give ${p.username} minecraft:compass{LodestonePos:{X:${bx},Y:${by},Z:${bz}},LodestoneDimension:"minecraft:overworld",LodestoneTracked:0b,display:{Name:'{"text":"塔底罗盘","color":"dark_purple"}'}} 1`)
  tell(p, `§5塌塔在西边，坐标 ${bx} ${by} ${bz}。塔心有脚手架，顺着下去。`)
  run(server, `playsound minecraft:block.deepslate_bricks.break neutral @a ${bx} ${bottom + 2} ${bz} 1 0.7`)
}

// ===== 手动搭巢穴：/mklair =====
ServerEvents.commandRegistry(event => {
  const { commands: Commands } = event
  event.register(Commands.literal('mklair').executes(ctx => {
    const player = ctx.source.player
    if (!player) return 0
    buildLair(ctx.source.server, player)
    player.tell('§a塔搭好了，罗盘在包里。')
    return 1
  }))
})