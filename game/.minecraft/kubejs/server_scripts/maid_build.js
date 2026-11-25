// 女仆自动施工（助手锤补丁，纯 KubeJS 实现，不改 mod jar）
//
// 效果：殖民地范围内的女仆会自动「拿助手锤施工」——
//   鼠标看工地时不必再自己点，附近的在建工单会被女仆们一块一块补上。
// 实现要点：
//   1. 用模组自己的 ItemAssistantHammer.placeBlock(player, colony, workOrder, pos)，
//      所以替换方块 / 阶段机 / 材料 / 权限全走原逻辑，不会摆错方块类型；
//   2. 每 tick 全局最多砌 MK_MAID.budget 块（默认 20），每个女仆每 MK_MAID.interval tick 砌 1 块，
//      避免单 tick 巨量改块把客户端渲染线程搞崩（crash-2026-11-24_00.24.04-client.txt 的教训）；
//   3. 女仆手上会被塞一把钻石助手锤，砌块时有挥臂动画，看起来就是女仆在干活。

var MK_MAID = {
  enabled: true,
  budget: 20,          // 每 tick 全局最多砌多少块
  interval: 10,        // 同一个女仆每多少 tick 砌 1 块
  scanLimit: 300,      // 每次扫描蓝图的最大条目数
  hammerId: 'minecolonies:assistanthammer_diamond',
  maidType: 'touhou_little_maid:maid',
  lastPlaced: {},      // maid uuid -> tick
  cursor: {}           // workOrder id -> 已扫到的蓝图下标
}

var MBBlockPos = Java.loadClass('net.minecraft.core.BlockPos')
var MBColonyManager = Java.loadClass('com.minecolonies.api.colony.IColonyManager')
var MBEquipmentSlot = Java.loadClass('net.minecraft.world.entity.EquipmentSlot')
var MBAABB = Java.loadClass('net.minecraft.world.phys.AABB')

function mbHammerItem() {
  try {
    return Item.of(MK_MAID.hammerId).item
  } catch (errItem) {
    return null
  }
}

function mbMaidOwner(server, maid, fallback) {
  try {
    var uuid = maid.getOwnerUUID()
    if (uuid) {
      var list = server.players
      for (var i = 0; i < list.size(); i++) {
        var p = list.get(i)
        try {
          if (String(p.uuid) === String(uuid)) return p
        } catch (errOne) {}
      }
    }
  } catch (errOwner) {}
  return fallback
}

function mbEquipHammer(maid) {
  try {
    var main = maid.getItemBySlot(MBEquipmentSlot.MAINHAND)
    if (main && !main.isEmpty() && String(main.id) === MK_MAID.hammerId) return
    maid.setItemSlot(MBEquipmentSlot.MAINHAND, Item.of(MK_MAID.hammerId))
  } catch (errEquip) {}
}

// 在一张已认领工单里，从 cursor 位置往后找「蓝图有、世界还没有」的方块，返回世界坐标或 null
function mbNextPosition(level, wo, cursorKey) {
  var bp = null
  try {
    bp = wo.getBlueprint()
  } catch (errBp) {
    return null
  }
  if (!bp) return null
  var infos = null
  var keys = null
  try {
    infos = bp.getBlockInfoAsMap()
    keys = infos.keySet().toArray()
  } catch (errKeys) {
    return null
  }
  if (!keys || keys.length === 0) return null
  var start = MK_MAID.cursor[cursorKey] || 0
  if (start >= keys.length) start = 0
  var loc = wo.getLocation()
  var primary = bp.getPrimaryBlockOffset()
  var scanned = 0
  var i = start
  var result = null
  while (scanned < MK_MAID.scanLimit) {
    if (i >= keys.length) i = 0
    var key = keys[i]
    i++
    scanned++
    var wp = null
    try {
      wp = loc.offset(key).subtract(primary)
    } catch (errOffset) {
      continue
    }
    var info = null
    try {
      info = infos.get(key)
    } catch (errInfo) {}
    if (!info) continue
    var want = ''
    try {
      want = String(info.getState())
    } catch (errState) {
      continue
    }
    if (want === 'minecraft:air') continue
    var have = ''
    try {
      have = String(level.getBlock(wp.getX(), wp.getY(), wp.getZ()).blockState)
    } catch (errHave) {
      continue
    }
    if (have === want) continue
    result = wp
    MK_MAID.cursor[cursorKey] = i
    break
  }
  if (!result) MK_MAID.cursor[cursorKey] = i
  return result
}

function mbTick(server) {
  if (!MK_MAID.enabled) return
  var now = server.tickCount
  var placed = 0
  var hammer = mbHammerItem()
  if (!hammer) return
  var players = server.players
  for (var pi = 0; pi < players.size(); pi++) {
    if (placed >= MK_MAID.budget) break
    var player = players.get(pi)
    var level = player.level
    var colonies = null
    try {
      colonies = MBColonyManager.getInstance().getColonies(level)
    } catch (errCol) {
      continue
    }
    for (var ci = 0; ci < colonies.size(); ci++) {
      if (placed >= MK_MAID.budget) break
      var colony = colonies.get(ci)
      var orders = null
      try {
        orders = colony.getWorkManager().getWorkOrders().values().toArray()
      } catch (errOrders) {
        continue
      }
      for (var oi = 0; oi < orders.length; oi++) {
        if (placed >= MK_MAID.budget) break
        var wo = orders[oi]
        var box = null
        try {
          if (!wo.isClaimed()) continue
          box = wo.getBoundingBox()
        } catch (errWo) {
          continue
        }
        if (!box) continue
        // 找这个工地附近的女仆（包围盒外扩 12 格）
        var maids = null
        try {
          maids = level.getEntitiesWithin(new MBAABB(
            box.minX - 12, box.minY - 12, box.minZ - 12,
            box.maxX + 12, box.maxY + 12, box.maxZ + 12
          ))
        } catch (errFind) {
          continue
        }
        if (!maids || maids.isEmpty()) continue
        var cursorKey = String(wo.getID ? wo.getID() : wo.hashCode())
        for (var mi = 0; mi < maids.size(); mi++) {
          if (placed >= MK_MAID.budget) break
          var maid = maids.get(mi)
          try {
            if (String(maid.type) !== MK_MAID.maidType) continue
            if (!maid.isAlive()) continue
          } catch (errMaid) {
            continue
          }
          var mid = null
          try {
            mid = String(maid.uuid)
          } catch (errUuid) {
            continue
          }
          var last = MK_MAID.lastPlaced[mid] || 0
          if (now - last < MK_MAID.interval) continue
          var pos = mbNextPosition(level, wo, cursorKey)
          if (!pos) continue
          var owner = mbMaidOwner(server, maid, player)
          if (!owner) continue
          MK_MAID.lastPlaced[mid] = now
          try {
            hammer.placeBlock(owner, colony, wo, pos)
            placed++
          } catch (errPlace) {
            if (placed === 0) console.info('[MKMAID] placeBlock 失败: ' + errPlace)
            continue
          }
          mbEquipHammer(maid)
          try {
            maid.swing('main_hand')
          } catch (errSwing) {}
        }
      }
    }
  }
}

ServerEvents.tick(function (event) {
  try {
    mbTick(event.server)
  } catch (errTick) {
    console.info('[MKMAID] tick 异常: ' + errTick)
  }
})

ServerEvents.commandRegistry(function (event) {
  var L = event.commands.literal
  event.register(
    L('mkmaid')
      .executes(function (ctx) {
        var p = ctx.source.playerOrException
        p.tell('§7女仆自动施工：' + (MK_MAID.enabled ? '§a开' : '§c关') + '§7，每 tick 上限 ' + MK_MAID.budget + ' 块，单女仆间隔 ' + MK_MAID.interval + ' tick。')
        return 1
      })
      .then(L('on').executes(function (ctx) {
        MK_MAID.enabled = true
        ctx.source.playerOrException.tell('§a女仆自动施工：已开启。')
        return 1
      }))
      .then(L('off').executes(function (ctx) {
        MK_MAID.enabled = false
        ctx.source.playerOrException.tell('§e女仆自动施工：已关闭。')
        return 1
      }))
  )
})
