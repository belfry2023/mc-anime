// ===== /mkplat —— 以玩家脚下为中心铺一块平整草地平台（放殖民地 / 城堡 / 建筑用） =====
// 用法：
//   /mkplat            中等平台（半径 20 → 41×41）
//   /mkplat big        大平台（半径 32 → 65×65）
//   /mkplat small      小平台（半径 12 → 25×25）
//   /mkplat huge       超大平台（半径 48 → 97×97，慎用，会削平地形）
// 说明：平台顶面在玩家脚下方 1 格（你正好站上去），向下 4 格泥土垫底，
//       平台上方 6 格全部清成空气（树、山体、雪都清掉），再在四角放海晶灯。
// 注意：/fill 单条命令最多 32768 格（gamerule commandModificationBlockLimit），
//       超大平台一次填会超限而整条命令失败，所以这里按 Z 轴切片分批执行。
// 需要重启客户端才会注册新命令。

var PLAT_CLEAR_HEIGHT = 6   // 平台上方清空的高度（格）
var PLAT_DEPTH = 4          // 平台向下垫底的厚度（格）
var PLAT_FILL_LIMIT = 30000 // 单条 /fill 允许的最大格数（留着安全余量）

// 分批 /fill：按 Z 轴切片，保证每片体积不超过 PLAT_FILL_LIMIT
function platFill(server, dim, x0, y0, z0, x1, y1, z1, block) {
  var sx = x1 - x0 + 1
  var sy = y1 - y0 + 1
  var perSlice = sx * sy
  if (perSlice <= 0) return
  var slice = Math.max(1, Math.floor(PLAT_FILL_LIMIT / perSlice))
  for (var z = z0; z <= z1; z += slice) {
    var zEnd = Math.min(z1, z + slice - 1)
    server.runCommandSilent('execute in ' + dim + ' run fill ' +
      x0 + ' ' + y0 + ' ' + z + ' ' + x1 + ' ' + y1 + ' ' + zEnd + ' ' + block)
  }
}

function platBuild(server, player, radius) {
  var px = Math.floor(player.x)
  var py = Math.floor(player.y)
  var pz = Math.floor(player.z)
  var x0 = px - radius, x1 = px + radius
  var z0 = pz - radius, z1 = pz + radius
  var top = py - 1

  var dim = String(player.level.dimension)

  // 1) 垫底：先把平台下方 PLAT_DEPTH 格填成泥土，防止悬空边角
  platFill(server, dim, x0, top - PLAT_DEPTH, z0, x1, top - 1, z1, 'minecraft:dirt')
  // 2) 表层草方块
  platFill(server, dim, x0, top, z0, x1, top, z1, 'minecraft:grass_block')
  // 3) 清空平台上方 PLAT_CLEAR_HEIGHT 格（树/山体/雪/水都清掉）
  platFill(server, dim, x0, py, z0, x1, py + PLAT_CLEAR_HEIGHT - 1, z1, 'minecraft:air')
  // 4) 四角放灯方便夜间施工
  ;[[x0, z0], [x0, z1], [x1, z0], [x1, z1]].forEach(function (c) {
    server.runCommandSilent('execute in ' + dim + ' run setblock ' + c[0] + ' ' + py + ' ' + c[1] + ' minecraft:sea_lantern')
  })

  var side = radius * 2 + 1
  player.tell('§a[平台] 已在脚下铺好 §e' + side + '×' + side + '§a 的草地平台（顶面 y=' + top + '，上方清空 ' + PLAT_CLEAR_HEIGHT + ' 格）。')
  player.tell('§7放殖民地的话：先 §e/mkcolony§7 领小屋，再把市政厅放在平台中央。')
}

ServerEvents.commandRegistry(function (event) {
  var C = event.commands

  function pOf(ctx) { return ctx.source.player }

  function doBuild(ctx, radius) {
    var p = pOf(ctx)
    if (!p) return 0
    platBuild(ctx.source.server, p, radius)
    return 1
  }

  event.register(
    C.literal('mkplat')
      .then(C.literal('small').executes(function (ctx) { return doBuild(ctx, 12) }))
      .then(C.literal('big').executes(function (ctx) { return doBuild(ctx, 32) }))
      .then(C.literal('huge').executes(function (ctx) { return doBuild(ctx, 48) }))
      .executes(function (ctx) { return doBuild(ctx, 20) })
  )
})
