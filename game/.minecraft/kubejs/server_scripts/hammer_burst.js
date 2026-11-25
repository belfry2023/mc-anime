// 助手锤连击（方案 A：服务器脚本驱动）
// 单击一次 = 排队 50 个「工地待砌位置」，之后每秒 tick 砌 1 块（20 tick = 1 秒，50 块约 2.5 秒）。
// 关键：调用的是模组自己的 public void placeBlock(Player, IColony, IWorkOrder, BlockPos)，
// 所以替换方块(placeholder)、工况阶段、材料/耐久、权限全部按模组原逻辑走，不会像 /mkfast 那样摆错方块。
// 之所以不再在同一个 tick 里跑几十上百块：单 tick 巨量改块会让客户端渲染线程撞
// ConcurrentModificationException 崩游戏（crash-2026-11-24_00.24.04-client.txt 就是这么来的）。

var MK_HB = {
  clicks: 50,          // 一次点击排队多少块
  hammers: [
    'minecolonies:assistanthammer_gold',
    'minecolonies:assistanthammer_iron',
    'minecolonies:assistanthammer_diamond'
  ],
  session: null
}

var HBBlockPos = Java.loadClass('net.minecraft.core.BlockPos')
var HBColonyManager = Java.loadClass('com.minecolonies.api.colony.IColonyManager')

function hbHammerId(player) {
  try {
    var stack = player.mainHandItem
    if (!stack || stack.isEmpty()) return null
    var id = String(stack.id)
    if (MK_HB.hammers.indexOf(id) >= 0) return id
  } catch (errMain) {}
  try {
    var off = player.offHandItem
    if (off && !off.isEmpty()) {
      var id2 = String(off.id)
      if (MK_HB.hammers.indexOf(id2) >= 0) return id2
    }
  } catch (errOff) {}
  return null
}

function hbHammerItem(id) {
  try {
    return Item.of(id).item
  } catch (errItem) {
    return null
  }
}

function hbColonyAt(level, pos) {
  try {
    var mgr = HBColonyManager.getInstance()
    var direct = mgr.getColonyByPosFromWorld(level, pos)
    if (direct) return direct
    var all = mgr.getColonies(level)
    for (var i = 0; i < all.size(); i++) {
      var c = all.get(i)
      try {
        if (c.isCoordInColony(level, pos)) return c
      } catch (errCoord) {}
    }
  } catch (errMgr) {
    console.info('[MKHB] 找殖民地失败: ' + errMgr)
  }
  return null
}

function hbOrderAt(colony, pos, level) {
  try {
    var orders = colony.getWorkManager().getWorkOrders()
    var values = orders.values().toArray()
    for (var i = 0; i < values.length; i++) {
      var wo = values[i]
      try {
        if (!wo.isClaimed()) continue
        var box = wo.getBoundingBox()
        if (!box) continue
        if (pos.getX() < box.minX - 4 || pos.getX() > box.maxX + 4) continue
        if (pos.getY() < box.minY - 4 || pos.getY() > box.maxY + 4) continue
        if (pos.getZ() < box.minZ - 4 || pos.getZ() > box.maxZ + 4) continue
        return wo
      } catch (errWo) {}
    }
  } catch (errOrders) {
    console.info('[MKHB] 读工单失败: ' + errOrders)
  }
  return null
}

// 找出点击点附近「蓝图里该有、位置上还没到位」的方块，按距离近到远排队
function hbQueue(level, wo, clickPos, limit) {
  var out = []
  try {
    var bp = wo.getBlueprint()
    if (!bp) return out
    var infos = bp.getBlockInfoAsMap()
    var keys = infos.keySet().toArray()
    var loc = wo.getLocation()
    var primary = bp.getPrimaryBlockOffset()
    var scored = []
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i]
      var wp
      try {
        wp = loc.offset(key).subtract(primary)
      } catch (errOff) {
        continue
      }
      var dx = wp.getX() - clickPos.getX()
      var dy = wp.getY() - clickPos.getY()
      var dz = wp.getZ() - clickPos.getZ()
      var dist = Math.abs(dx) + Math.abs(dy) + Math.abs(dz)
      if (dist > 20) continue
      scored.push([dist, wp])
    }
    scored.sort(function (a, b) { return a[0] - b[0] })
    for (var j = 0; j < scored.length && out.length < limit; j++) out.push(scored[j][1])
  } catch (errQueue) {
    console.info('[MKHB] 生成队列失败: ' + errQueue)
  }
  return out
}

function hbStart(player, level, pos) {
  var hammerId = hbHammerId(player)
  if (!hammerId) return false
  var hammer = hbHammerItem(hammerId)
  if (!hammer) return false
  var colony = hbColonyAt(level, pos)
  if (!colony) {
    player.tell('§c助手锤连击：这里不是你的殖民地。')
    return true
  }
  var wo = hbOrderAt(colony, pos, level)
  if (!wo) {
    player.tell('§c助手锤连击：附近没有已认领的在建工单（先让建筑工接单）。')
    return true
  }
  var queue = hbQueue(level, wo, pos, MK_HB.clicks)
  if (!queue.length) {
    player.tell('§e助手锤连击：这个工地暂时没有可砌的方块。')
    return true
  }
  MK_HB.session = {
    player: player,
    level: level,
    colony: colony,
    order: wo,
    hammer: hammer,
    hammerId: hammerId,
    queue: queue,
    index: 0,
    placed: 0,
    failed: 0,
    ticks: 0
  }
  player.tell('§a助手锤连击：已排队 §e' + queue.length + ' §a块，每秒 1 块开始施工……')
  return true
}

function hbTick(server) {
  var s = MK_HB.session
  if (!s) return
  var player = s.player
  if (!player || !player.isAlive()) {
    MK_HB.session = null
    return
  }
  // 清掉服务端冷却（客户端那 5 tick 只是显示，不影响我们驱动）
  try {
    player.getCooldowns().removeCooldown(s.hammer)
  } catch (errCd) {}
  if (s.index >= s.queue.length) {
    player.tell('§a助手锤连击完成：成功 §e' + s.placed + ' §a块' + (s.failed > 0 ? '，失败 ' + s.failed : '') + '。')
    MK_HB.session = null
    return
  }
  var pos = s.queue[s.index]
  s.index++
  s.ticks++
  try {
    s.hammer.placeBlock(player, s.colony, s.order, pos)
    s.placed++
  } catch (errPlace) {
    s.failed++
    if (s.failed <= 3) console.info('[MKHB] placeBlock 失败 @ ' + pos + ' : ' + errPlace)
  }
  if (s.ticks % 10 === 0 && s.index < s.queue.length) {
    try {
      player.displayClientMessage(Component.literal('§7助手锤连击 §e' + s.placed + '§7/' + s.queue.length), true)
    } catch (errBar) {}
  }
}

ServerEvents.tick(function (event) {
  hbTick(event.server)
})

BlockEvents.rightClicked(function (event) {
  try {
    if (event.hand !== 'MAIN_HAND' && event.hand !== 'OFF_HAND') return
    var player = event.player
    if (!player) return
    var hammerId = hbHammerId(player)
    if (!hammerId) return
    // 清服务端冷却（真正的 5 tick 冷却只是显示，模组自身并不阻断连续使用）
    var item = hbHammerItem(hammerId)
    if (item) {
      try {
        player.getCooldowns().removeCooldown(item)
      } catch (errCd2) {}
    }
    hbStart(player, event.level, event.block.pos)
  } catch (errEvent) {
    console.info('[MKHB] rightClicked 异常: ' + errEvent)
  }
})

ServerEvents.commandRegistry(function (event) {
  var L = event.commands.literal
  event.register(
    L('mkburst')
      .executes(function (ctx) {
        var p = ctx.source.playerOrException
        var s = MK_HB.session
        if (!s) {
          p.tell('§7助手锤连击：当前没有进行中的连击。用法：手持助手锤右键工地。')
        } else {
          p.tell('§7助手锤连击：进度 ' + s.placed + '/' + s.queue.length + '（已尝试 ' + s.index + '，失败 ' + s.failed + '）')
        }
        return 1
      })
      .then(L('stop').executes(function (ctx) {
        var p = ctx.source.playerOrException
        MK_HB.session = null
        p.tell('§e助手锤连击：已停止。')
        return 1
      }))
  )
})
