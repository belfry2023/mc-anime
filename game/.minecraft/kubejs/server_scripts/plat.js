// ===== /mkplat —— 以玩家脚下为中心铺一块平整草地平台（放殖民地 / 城堡 / 建筑用） =====
// 用法：
//   /mkplat            中等平台（半径 20 → 41×41）
//   /mkplat big        大平台（半径 32 → 65×65）
//   /mkplat small      小平台（半径 12 → 25×25）
//   /mkplat huge       超大平台（半径 48 → 97×97，慎用，会削平地形）
// 说明：平台顶面在玩家脚下方 1 格（你正好站上去），向下 3 格泥土垫底，
//       向上 6 格空气，避免山体/树挡住建房。
// 需要重启客户端才会注册新命令。

function platBuild(server, player, radius) {
  var px = Math.floor(player.x)
  var py = Math.floor(player.y)
  var pz = Math.floor(player.z)
  var x0 = px - radius, x1 = px + radius
  var z0 = pz - radius, z1 = pz + radius
  var top = py - 1

  var dim = String(player.level.dimension)
  function run(cmd) {
    server.runCommandSilent('execute in ' + dim + ' run ' + cmd)
  }

  // 1) 垫底：泥土/石头，防止平台悬空边角
  run('fill ' + x0 + ' ' + (top - 4) + ' ' + z0 + ' ' + x1 + ' ' + (top - 1) + ' ' + z1 + ' minecraft:dirt')
  // 2) 表层草方块
  run('fill ' + x0 + ' ' + top + ' ' + z0 + ' ' + x1 + ' ' + top + ' ' + z1 + ' minecraft:grass_block')
  // 3) 清空上方 6 格，避免树/山体挡建筑
  run('fill ' + x0 + ' ' + py + ' ' + z0 + ' ' + x1 + ' ' + (py + 5) + ' ' + z1 + ' minecraft:air')
  // 4) 四角放灯方便夜间施工
  ;[[x0, z0], [x0, z1], [x1, z0], [x1, z1]].forEach(function (c) {
    run('setblock ' + c[0] + ' ' + py + ' ' + c[1] + ' minecraft:sea_lantern')
  })

  var side = radius * 2 + 1
  player.tell('§a[平台] 已在脚下铺好 §e' + side + '×' + side + '§a 的草地平台（顶面 y=' + top + '）。')
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
