// /mkboost —— 把殖民地的「建造效率」拉满（不碰世界方块，零风险）
//
// 说明：MineColonies 没有「瞬间建造」的服务端开关（serverconfig 里 60 个键都没有建造速度项），
//       所以想快只有一个正路：**让建筑工本身变快**。
//       建筑工的施工速度取决于：
//         1) 技能等级（Adaptability / Dexterity 等，等级越高动作越快、越省材料）
//         2) 手里的工具品质与附魔（挖掘/放置方块的速度）
//         3) 材料是否断供（配合 /mkbuild auto 常驻补料）
//         4) 建筑工小屋数量（并行工地）
//
// 本脚本做 1) 和 2)：
//   /mkboost          → 本殖民地全体公民技能设为 99，并给每个「建筑工小屋」塞一套满附魔下界合金工具
//   /mkboost skills   → 只拉技能
//   /mkboost tools    → 只发工具
//
// 工具是直接放进建筑工小屋的储物格里（建筑工会自己取用），不消耗、不掉落、不改方块。

var MKBOOST_COLONY = Java.loadClass('com.minecolonies.api.colony.IColonyManager')
var MKBOOST_SKILL_LEVEL = 99

var mkBoostLastError = ''

function mkBoostColony(level, pos) {
  try {
    var c = MKBOOST_COLONY.getInstance().getColonyByPosFromWorld(level, pos)
    if (c) return c
  } catch (e0) { mkBoostLastError = 'getColonyByPosFromWorld: ' + e0 }
  try {
    var list = MKBOOST_COLONY.getInstance().getColonies(level)
    for (var i = 0; i < list.size(); i++) {
      var cc = list.get(i)
      if (cc && cc.isCoordInColony(level, pos)) return cc
    }
  } catch (e1) { mkBoostLastError = 'getColonies: ' + e1 }
  return null
}

function mkBoostSkills(colony) {
  var done = 0
  try {
    var citizens = colony.getCitizenManager().getCitizens()
    for (var i = 0; i < citizens.size(); i++) {
      var cd = citizens.get(i)
      if (!cd) continue
      try {
        var handler = cd.getCitizenSkillHandler()
        if (!handler) continue
        var map = handler.getSkills()
        if (!map) continue
        var it = map.values().iterator()
        while (it.hasNext()) {
          var sd = it.next()
          sd.setLevel(MKBOOST_SKILL_LEVEL)
          sd.setExperience(0)
        }
        cd.markDirty()
        done++
      } catch (eOne) {
        mkBoostLastError = 'skill: ' + eOne
      }
    }
  } catch (eAll) {
    mkBoostLastError = 'citizens: ' + eAll
  }
  return done
}

function mkBoostTools(hutList) {
  var tools = [
    Item.of('minecraft:netherite_pickaxe', '{Enchantments:[{id:"minecraft:efficiency",lvl:5s},{id:"minecraft:unbreaking",lvl:3s}]}'),
    Item.of('minecraft:netherite_shovel', '{Enchantments:[{id:"minecraft:efficiency",lvl:5s},{id:"minecraft:unbreaking",lvl:3s}]}'),
    Item.of('minecraft:netherite_axe', '{Enchantments:[{id:"minecraft:efficiency",lvl:5s},{id:"minecraft:unbreaking",lvl:3s}]}'),
    Item.of('minecraft:netherite_hoe', '{Enchantments:[{id:"minecraft:efficiency",lvl:5s},{id:"minecraft:unbreaking",lvl:3s}]}'),
    Item.of('minecraft:shears', '{Enchantments:[{id:"minecraft:efficiency",lvl:5s},{id:"minecraft:unbreaking",lvl:3s}]}')
  ]
  var huts = 0
  var inserted = 0
  for (var i = 0; i < hutList.length; i++) {
    var b = hutList[i]
    try {
      var handlers = b.getHandlers()
      if (!handlers) continue
      var put = 0
      for (var h = 0; h < handlers.size(); h++) {
        var inv = handlers.get(h)
        if (!inv) continue
        for (var t = 0; t < tools.length; t++) {
          var rest = tools[t]
          for (var s = 0; s < inv.getSlots() && !rest.isEmpty(); s++) {
            rest = inv.insertItem(s, rest, false)
          }
          if (rest.isEmpty()) put++
        }
      }
      if (put > 0) {
        huts++
        inserted += put
        try { b.markDirty() } catch (eMD) {}
      }
    } catch (eHut) {
      mkBoostLastError = 'hut: ' + eHut
    }
  }
  return { huts: huts, inserted: inserted }
}

function mkBoostAll(player) {
  var colony = mkBoostColony(player.level, player.blockPosition())
  if (!colony) {
    player.tell('§c[MK] 你不在任何殖民地领土内。' + (mkBoostLastError ? ' §8(' + mkBoostLastError + ')' : ''))
    return
  }
  var n = mkBoostSkills(colony)
  player.tell('§a[MK] 已把 §e' + n + ' §a名公民的技能设为 §e' + MKBOOST_SKILL_LEVEL + '§a。')

  var builders = []
  try {
    var all = colony.getBuildingManager().getBuildings().values().toArray()
    for (var i = 0; i < all.length; i++) {
      var b = all[i]
      var cls = String(b.getClass().getName())
      if (cls.indexOf('BuildingBuilder') >= 0) builders.push(b)
    }
  } catch (eB) {
    player.tell('§c[MK] 读取建筑列表失败：' + eB)
    return
  }
  if (builders.length === 0) {
    player.tell('§e[MK] 这个殖民地还没有建筑工小屋（先放一个 minecolonies:blockhutbuilder）。')
    return
  }
  var r = mkBoostTools(builders)
  player.tell('§a[MK] 给 §e' + r.huts + ' §a个建筑工小屋塞了 §e' + r.inserted + ' §a件满附魔工具（效率 V + 耐久 III）。' + (mkBoostLastError ? ' §8(' + mkBoostLastError + ')' : ''))
  player.tell('§7[MK] 想让建造更快：多放几个建筑工小屋并行 + 常开 /mkbuild auto 补料。')
  console.info('[MKBOOST] citizens=' + n + ' huts=' + r.huts + ' tools=' + r.inserted)
}

function mkBoostSkillsOnly(player) {
  var colony = mkBoostColony(player.level, player.blockPosition())
  if (!colony) { player.tell('§c[MK] 你不在任何殖民地领土内。'); return }
  var n = mkBoostSkills(colony)
  player.tell('§a[MK] 已把 §e' + n + ' §a名公民技能设为 §e' + MKBOOST_SKILL_LEVEL + '§a。')
}

function mkBoostToolsOnly(player) {
  var colony = mkBoostColony(player.level, player.blockPosition())
  if (!colony) { player.tell('§c[MK] 你不在任何殖民地领土内。'); return }
  var builders = []
  try {
    var all = colony.getBuildingManager().getBuildings().values().toArray()
    for (var i = 0; i < all.length; i++) {
      if (String(all[i].getClass().getName()).indexOf('BuildingBuilder') >= 0) builders.push(all[i])
    }
  } catch (eB) { player.tell('§c[MK] 读取建筑列表失败：' + eB); return }
  if (builders.length === 0) { player.tell('§e[MK] 这个殖民地还没有建筑工小屋。'); return }
  var r = mkBoostTools(builders)
  player.tell('§a[MK] 给 §e' + r.huts + ' §a个建筑工小屋塞了 §e' + r.inserted + ' §a件满附魔工具。')
}

ServerEvents.commandRegistry(event => {
  var L = event.commands.literal
  event.register(
    L('mkboost')
      .executes(ctx => { mkBoostAll(ctx.source.playerOrException); return 1 })
      .then(L('skills').executes(ctx => { mkBoostSkillsOnly(ctx.source.playerOrException); return 1 }))
      .then(L('tools').executes(ctx => { mkBoostToolsOnly(ctx.source.playerOrException); return 1 }))
  )
})
