// /mkhammer —— 把「建筑工助手锤」变成一键批量施工
// 原理：MineColonies 的助手锤每次右键只砌 1 块方块（ItemAssistantHammer.tryBuildingBlockNearby
//       在 (reach*2+1)^3 的邻域里找到第一个能放的方块就 return），所以一面墙要右键上千次。
//       这里直接循环调用同一个物品的 useOnBlock(player, pos)，一次命令把手上的工地扫完。
// 关于「生效范围」：助手的 reach 是 1/2/3（金/铁/钻石），只决定「以点击位置为中心扫多大一圈」，
//       由物品自己处理；useOnBlock 本身并不检查玩家与方块的距离，只要求点击点落在
//       某个已认领工地的包围盒（外扩 2 格）内。所以我们按包围盒采样点位循环调用即可，
//       采样步长 2 格，配合 reach≥1 的覆盖圈不会漏格子。
// 说明：走的是模组自己的施工逻辑（权限、工单、材料、保护都照旧生效），不是硬塞方块。

var MK_HAMMER_COLONY = Java.loadClass('com.minecolonies.api.colony.IColonyManager')

var MK_HAMMER_STEP = 2      // 采样步长（格）
var MK_HAMMER_PASSES = 3    // 默认跑几轮（一轮覆盖不完，多轮补齐）
var MK_HAMMER_CALLS = 6000  // 默认单次最多调用多少次 useOnBlock

function mkHammerColony(level, pos) {
  try {
    var c = MK_HAMMER_COLONY.getInstance().getColonyByPosFromWorld(level, pos)
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

function mkHammerRun(player, passes, limit) {
  var level = player.level
  var colony = mkHammerColony(level, player.blockPosition())
  if (!colony) {
    player.tell('§c你没站在自己的殖民地里，助手锤只能给自家工地补方块。')
    return 0
  }
  var hammer = mkHammerItem(player)
  if (!hammer) {
    player.tell('§c找不到助手锤。请把金/铁/钻石助手锤拿在手上。')
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

  // 先把可施工的工地（已认领 + 有包围盒）收成数组
  var sites = []
  var values = orders.values().toArray()
  for (var oi = 0; oi < values.length; oi++) {
    try {
      var wo = values[oi]
      if (!wo.isClaimed()) continue
      var box = wo.getBoundingBox()
      if (!box) continue
      sites.push([Math.floor(box.minX), Math.floor(box.minY), Math.floor(box.minZ),
                  Math.ceil(box.maxX), Math.ceil(box.maxY), Math.ceil(box.maxZ)])
    } catch (eWo) {}
  }
  if (sites.length === 0) {
    player.tell('§7没有已认领的施工工地（建筑工还没接手，或工地已完工）。')
    return 0
  }

  var calls = 0
  var over = false
  for (var pass = 0; pass < passes && !over; pass++) {
    for (var si = 0; si < sites.length && !over; si++) {
      var s = sites[si]
      for (var x = s[0]; x <= s[3] && !over; x += MK_HAMMER_STEP) {
        for (var y = s[1]; y <= s[4] && !over; y += MK_HAMMER_STEP) {
          for (var z = s[2]; z <= s[5] && !over; z += MK_HAMMER_STEP) {
            if (calls >= limit) { over = true; break }
            try {
              var bc = level.getBlock(x, y, z)
              hammer.useOnBlock(player, bc.pos)
            } catch (eCall) {}
            calls++
          }
        }
      }
      mkHammerClearCd(player, hammer)
    }
  }

  player.tell('§a助手锤批量施工：跑了 §e' + passes + ' §a轮、调用 §e' + calls + ' §a次，覆盖 §e' + sites.length + ' §a个工地。')
  if (over) player.tell('§7达到本次上限（' + limit + '），再执行一次 /mkhammer 继续。')
  else player.tell('§7若还没建完，再执行一次 /mkhammer（每次都会把能放的补齐）。')
  return calls
}

ServerEvents.commandRegistry(event => {
  var L = event.commands.literal
  event.register(L('mkhammer')
    .executes(ctx => {
      mkHammerRun(ctx.source.playerOrException, MK_HAMMER_PASSES, MK_HAMMER_CALLS)
      return 1
    })
    .then(L('cd').executes(ctx => {
      var p = ctx.source.playerOrException
      var hammer = mkHammerItem(p)
      if (!hammer) { p.tell('§c没找到助手锤。'); return 0 }
      var ok = mkHammerClearCd(p, hammer)
      p.tell(ok ? '§a已清掉助手锤的冷却。' : '§e清冷却失败。')
      return 1
    }))
    .then(L('more').executes(ctx => {
      mkHammerRun(ctx.source.playerOrException, MK_HAMMER_PASSES * 2, MK_HAMMER_CALLS * 2)
      return 1
    }))
  )
})
