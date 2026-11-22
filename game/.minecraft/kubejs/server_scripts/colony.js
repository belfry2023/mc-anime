// ===== /mkcolony —— MineColonies 殖民地一键启动包 =====
// 用法：/mkcolony            给你整套建筑小屋（市政厅 + 兵营 + 哨塔 + 生产链 + 民居…）
//       /mkcolony mats       往你脚下的箱子里塞一批 Lv1 建材
//       /mkcolony raid       立刻对你的殖民地发动一次袭击（等同 /mc raid now）
//       /mkcolony help       步骤提示
//
// 说明：MineColonies 的殖民地只能由「玩家放下市政厅」创建，之后由建筑工慢慢盖。
//       所以这里给的是「材料 + 蓝图小屋 + 守卫配置」的完整启动包。

var COLONY_HUTS = [
  // [注册名, 显示名, 数量]
  ['blockhuttownhall', '市政厅', 1],
  ['blockhutbuilder', '建筑工小屋', 2],
  ['blockhutcitizen', '民居', 4],
  ['blockhuttavern', '酒馆', 1],
  ['blockhutwarehouse', '仓库', 1],
  ['blockhutdeliveryman', '快递员小屋', 1],
  ['blockhutcook', '厨师小屋', 1],
  ['blockhutfarm', '农田', 1],
  ['blockhutfield', '田地', 2],
  ['blockhutlumberjack', '伐木工小屋', 1],
  ['blockhutminer', '矿工小屋', 1],
  ['blockhutsawmill', '锯木厂', 1],
  ['blockhutsmeltery', '冶炼厂', 1],
  ['blockhutguardtower', '守卫塔', 3],
  ['blockhutbarracks', '兵营', 1],
  ['blockhutbarrackstower', '兵营塔', 2],
  ['blockhuthospital', '医院', 1],
  ['blockhutstonesmeltery', '石炉', 1],
  ['blockhutstonemason', '石匠小屋', 1],
  ['blockhutblacksmith', '铁匠小屋', 1]
]

var COLONY_MATS = [
  ['minecraft:oak_log', 64], ['minecraft:cobblestone', 64], ['minecraft:stone', 64],
  ['minecraft:oak_planks', 64], ['minecraft:glass', 64], ['minecraft:torch', 64],
  ['minecraft:white_wool', 32], ['minecraft:iron_ingot', 32], ['minecraft:coal', 64],
  ['minecraft:bread', 32], ['minecraft:chest', 16], ['minecraft:ladder', 32]
]

function colGive(server, player, item, count) {
  server.runCommandSilent('give ' + player.username + ' ' + item + ' ' + count)
}

function colonyKit(server, player) {
  var n = 0
  COLONY_HUTS.forEach(function (h) {
    colGive(server, player, 'minecolonies:' + h[0], h[2])
    n += h[2]
  })
  player.tell('§a[殖民地] 已发放 ' + n + ' 个建筑小屋（共 ' + COLONY_HUTS.length + ' 种）。')
  player.tell('§7建议顺序：§e市政厅 → 2 个建筑工 → 仓库 → 民居×4 → 农田/伐木/矿工 → 兵营 + 守卫塔')
  player.tell('§7建筑工会慢慢盖；材料不够时用 §e/mkcolony mats §7补充。')
}

function colonyMats(server, player) {
  var px = Math.floor(player.x), py = Math.floor(player.y), pz = Math.floor(player.z)
  // 在脚下放一个箱子并把材料塞进去
  server.runCommandSilent('setblock ' + px + ' ' + py + ' ' + pz + ' minecraft:chest')
  var i = 0
  COLONY_MATS.forEach(function (m) {
    server.runCommandSilent('item replace block ' + px + ' ' + py + ' ' + pz + ' container.' + i + ' with ' + m[0] + ' ' + m[1])
    i++
  })
  player.tell('§a[殖民地] 已在你脚下的箱子里放好 Lv1 基础建材（12 格）。')
}

function colonyRaid(server, player) {
  server.runCommandSilent('execute as ' + player.username + ' at @s run mc raid now')
  player.tell('§c[殖民地] 已尝试立刻对你的殖民地发动袭击（需要已创建殖民地且在殖民地附近）。')
  player.tell('§7如果没反应：用 §e/mc raid now§7 手动指定殖民地，或用 §e/mkwar§7 的传统城防战。')
}

function colonyHelp(player) {
  player.tell('§6—— 殖民地启动步骤 ——')
  player.tell('§71. 找一块空地，放下 §e市政厅§7（会创建殖民地并领取区块）')
  player.tell('§72. 放下 §e建筑工小屋§7，把市民拖去当建筑工；再放 §e仓库§7')
  player.tell('§73. 放 §e民居§7 招人 → 农田/伐木/矿工养经济')
  player.tell('§74. 放 §e兵营 + 守卫塔§7，把市民指派成卫兵（防御力就看这一步）')
  player.tell('§75. 想看打仗：§e/mkcolony raid§7 或 §e/mc raid now§7 立刻来一波；平时每几晚也会自己来')
}

ServerEvents.commandRegistry(function (event) {
  var C = event.commands

  function pOf(ctx) { return ctx.source.player }

  event.register(
    C.literal('mkcolony')
      .then(C.literal('mats').executes(function (ctx) {
        var p = pOf(ctx); if (!p) return 0
        colonyMats(ctx.source.server, p); return 1
      }))
      .then(C.literal('raid').executes(function (ctx) {
        var p = pOf(ctx); if (!p) return 0
        colonyRaid(ctx.source.server, p); return 1
      }))
      .then(C.literal('help').executes(function (ctx) {
        var p = pOf(ctx); if (!p) return 0
        colonyHelp(p); return 1
      }))
      .executes(function (ctx) {
        var p = pOf(ctx); if (!p) return 0
        colonyKit(ctx.source.server, p)
        colonyHelp(p)
        return 1
      })
  )
})
