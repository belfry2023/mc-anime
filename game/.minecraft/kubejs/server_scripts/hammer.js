// /mkhammer —— 把「建筑工助手锤」变成一键批量施工
// 原理：MineColonies 的助手锤每次右键只砌 1 块方块（ItemAssistantHammer.tryBuildingBlockNearby
//       在 (reach+1)^3 邻域里找到第一个能放的方块就 return），所以一面墙要右键上千次。
//       这里直接循环调用同一个物品的 useOnBlock(player, pos)，一次命令把手上的工地扫完。
// 说明：走的是模组自己的施工逻辑（权限、工单、材料、保护都照旧生效），不是硬塞方块。
//
// 用法：
//   /mkhammer          扫脚下工地，最多处理 8000 次点击
//   /mkhammer 20000    自定义上限
//   /mkhammer cd       把手里助手锤的冷却（5 tick）清掉

var MK_HAMMER_COLONY = Java.loadClass('com.minecolonies.api.colony.IColonyManager')

function mkHammerColony(level, pos) {
  try {
    var mgr = MK_HAMMER_COLONY.getInstance()
    var c = mgr.getColonyByPosFromWorld(level, pos)
    if (c) return c
  } catch (e1) {}
  try {
    var list = MK_HAMMER_COLONY.getInstance().getColonies(level)
    for (var i = 0; i < list.size(); i++) {
      var cc = list.get(i)
      if (cc && cc.isCoordInColony(level, pos)) return cc
    }
  } catch (e2) {}
  return null
}

function mkHammerItem(player) {
  try {
    var stack = player.mainHandItem
    if (stack && String(stack.id).indexOf('assistanthammer') >= 0) return stack.item
  } catch (e1) {}
  try {
    return Item.of('minecolonies:assistanthammer_diamond').item
  } catch (e2) {}
  return null
}

function mkHammerClearCd(player, hammer) {
  try {
    player.getCooldowns().removeCooldown(hammer)
    return true
  } catch (e) {
    return false
  }
}

function mkHammerRun(player, limit) {
  var level = player.level
  var colony = mkHammerColony(level, player.blockPosition())
  if (!colony) {
    player.tell('§c你没站在自己的殖民地里，助手锤只能给自家工地补方块。')
    return 0
  }
  var hammer = mkHammerItem(player)
  if (!hammer) {
    player.tell('§c找不到助手锤。请把金/铁/钻石助手锤拿在手上，或先在背包里准备一把。')
    return 0
  }

  var orders = null
  try {
    orders = colony.getWorkManager().getWorkOrders()
  } catch (eOrders) {
    player.tell('§c读取工单失败：' + eOrders)
    return 0
  }
  if (!orders || orders.isEmpty()) {
    player.tell('§7这个殖民地目前没有施工中的工地。')
    return 0
  }

  var calls = 0
  var placedOrders = 0
  var over = false
  var values = orders.values().toArray()
  for (var oi = 0; oi < values.length && !over; oi++) {
    var wo = values[oi]
    var box = null
    try {
      if (!wo.isClaimed()) continue
      box = wo.getBoundingBox()
    } catch (eWo) {
      continue
    }
    if (!box) continue
    var used = 0
    for (var x = Math.floor(box.minX); x <= Math.ceil(box.maxX) && !over; x++) {
      for (var y = Math.floor(box.minY); y <= Math.ceil(box.maxY) && !over; y++) {
        for (var z = Math.floor(box.minZ); z <= Math.ceil(box.maxZ) && !over; z++) {
          if (calls >= limit) { over = true; break }
          try {
            var bc = level.getBlock(x, y, z)
            hammer.useOnBlock(player, bc.pos)
            calls++
            used++
          } catch (eCall) {
            calls++
          }
        }
      }
    }
    if (used > 0) placedOrders++
    mkHammerClearCd(player, hammer)
  }

  player.tell('§a助手锤批量施工：扫描 §e' + calls + ' §a个位置，覆盖 §e' + placedOrders + ' §a个工地。')
  if (over) player.tell('§7达到本次上限（' + limit + '），再执行一次 /mkhammer 继续。')
  return calls
}

ServerEvents.commandRegistry(event => {
  var L = event.commands.literal
  var I = event.commands.argument
  event.register(L('mkhammer')
    .executes(ctx => {
      var p = ctx.source.playerOrException
      mkHammerRun(p, 8000)
      return 1
    })
    .then(I('count', Java.loadClass('net.minecraft.commands.arguments.IntegerArgumentType').integer(1, 200000))
      .executes(ctx => {
        var p = ctx.source.playerOrException
        var n = Java.loadClass('net.minecraft.commands.arguments.IntegerArgumentType').getInteger(ctx, 'count')
        mkHammerRun(p, n)
        return 1
      }))
    .then(L('cd').executes(ctx => {
      var p = ctx.source.playerOrException
      var hammer = mkHammerItem(p)
      if (!hammer) { p.tell('§c没找到助手锤。'); return 0 }
      var ok = mkHammerClearCd(p, hammer)
      p.tell(ok ? '§a已清掉助手锤的冷却。' : '§e清冷却失败（这次没读到冷却数据）。')
      return 1
    }))
  )
})
