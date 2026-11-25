// /mkfast —— 服务端分批「补全在建建筑」
//
// 背景：MineColonies 的助手锤 ItemAssistantHammer.useOnBlock() 在服务端是空转的
//       （它内部先取 IColonyManager.getColonyView(...)，而 colony view 只在客户端存在，
//        服务端拿到 null 就直接 return），所以循环调用它一块也砌不上。
//       而在单 tick 里硬塞上万次方块变更又会把服务端拖住几十秒，
//       导致渲染线程读区块 block entity 映射时撞上 HashMap 并发修改 → ConcurrentModificationException 崩溃。
//
// 方案：直接从「工单蓝图」读方块表（服务端可用），按世界坐标算好后
//       **分 tick、限流**地用 setblock 补齐，每 tick 最多放 MKFAST_BUDGET 块。
//       等同于创造模式 Build Tool 的 “Schematic Paste”，但走原版 setblock，安全可控。
//
// 注意：只补方块状态，不写 block entity（箱子里的内容等）——新建工地本来就是空的，影响很小。

var MKFAST_COLONY = Java.loadClass('com.minecolonies.api.colony.IColonyManager')

var MKFAST_BUDGET = 120     // 每 tick 最多放置多少块
var MKFAST_SCAN = 2000      // 每 tick 最多检查多少个蓝图位置

var mkfastSession = null

function mkfastColony(level, pos) {
  try {
    var c = MKFAST_COLONY.getInstance().getColonyByPosFromWorld(level, pos)
    if (c) return c
  } catch (e0) {}
  try {
    var all = MKFAST_COLONY.getInstance().getColonies(level)
    for (var i = 0; i < all.size(); i++) {
      var c2 = all.get(i)
      if (c2 && c2.isCoordInColony(level, pos)) return c2
    }
  } catch (e1) {}
  return null
}

function mkfastCollect(colony) {
  var jobs = []
  try {
    var orders = colony.getWorkManager().getWorkOrders()
    var arr = orders.values().toArray()
    for (var i = 0; i < arr.length; i++) {
      var wo = arr[i]
      try {
        if (!wo.isClaimed()) continue
        var bp = wo.getBlueprint()
        if (!bp) continue
        var map = bp.getBlockInfoAsMap()
        if (!map || map.isEmpty()) continue
        jobs.push({
          map: map,
          loc: wo.getLocation(),
          primary: bp.getPrimaryBlockOffset(),
          keys: map.keySet().toArray(),
          idx: 0,
          total: map.size(),
          placed: 0
        })
      } catch (eSkip) {}
    }
  } catch (eAll) {
    console.info('[MKFAST] 读取工单失败: ' + eAll)
  }
  return jobs
}

function mkfastDone(s) {
  var msg = '§a[MK] 补全完成：' + s.placed + ' 块方块已放置。'
  try {
    s.player.tell(msg)
  } catch (eTell) {}
  console.info('[MKFAST] done, placed=' + s.placed)
  mkfastSession = null
}

function mkfastStep(server) {
  var s = mkfastSession
  if (!s) return
  var player = s.player
  if (!player || !player.isAlive()) {
    mkfastSession = null
    return
  }
  var level = player.level
  var dim = String(level.dimension)

  var budget = MKFAST_BUDGET
  var scanned = 0
  var placed = 0

  while (scanned < MKFAST_SCAN && budget > 0) {
    if (s.ji >= s.jobs.length) {
      s.placed += placed
      mkfastDone(s)
      return
    }
    var job = s.jobs[s.ji]
    if (job.idx >= job.keys.length) {
      s.ji++
      continue
    }
    var key = job.keys[job.idx]
    job.idx++
    scanned++
    try {
      var info = job.map.get(key)
      if (!info) continue
      var state = String(info.getState())
      if (state === 'minecraft:air' || state === 'minecraft:cave_air' || state === 'minecraft:void_air') continue
      var wp = job.loc.offset(key).subtract(job.primary)
      var x = wp.getX()
      var y = wp.getY()
      var z = wp.getZ()
      var cur = ''
      try {
        cur = String(level.getBlock(x, y, z).blockState)
      } catch (eCur) {
        cur = ''
      }
      if (cur === state) continue
      server.runCommandSilent('execute in ' + dim + ' run setblock ' + x + ' ' + y + ' ' + z + ' ' + state)
      placed++
      budget--
      job.placed++
    } catch (eOne) {
      s.errors = (s.errors || 0) + 1
      if (s.errors <= 3) console.info('[MKFAST] 放置失败: ' + eOne)
    }
  }

  s.placed += placed

  if (server.tickCount % 20 === 0) {
    try {
      var remain = 0
      for (var i = s.ji; i < s.jobs.length; i++) remain += s.jobs[i].total - s.jobs[i].idx
      player.tell('§7[MK] 补全中… 已放置 ' + s.placed + ' 块，剩余约 ' + remain + ' 个位置')
    } catch (eTell2) {}
  }
}

function mkfastStart(player) {
  if (mkfastSession) {
    player.tell('§e[MK] 已经有补全任务在跑，先 /mkfast stop。')
    return
  }
  var level = player.level
  var colony = mkfastColony(level, player.blockPosition())
  if (!colony) {
    player.tell('§c[MK] 你不在任何殖民地领土内。')
    return
  }
  var jobs = mkfastCollect(colony)
  if (jobs.length === 0) {
    player.tell('§e[MK] 没有找到「已认领 + 有蓝图」的工单。先让建筑工接手工单再来。')
    return
  }
  var total = 0
  for (var i = 0; i < jobs.length; i++) total += jobs[i].total
  mkfastSession = { player: player, jobs: jobs, ji: 0, placed: 0, errors: 0 }
  player.tell('§a[MK] 开始补全 ' + jobs.length + ' 个工地，共 ' + total + ' 个蓝图位置，每 tick 最多 ' + MKFAST_BUDGET + ' 块。')
  console.info('[MKFAST] start jobs=' + jobs.length + ' positions=' + total)
}

function mkfastStop(player) {
  if (!mkfastSession) {
    player.tell('§7[MK] 当前没有补全任务。')
    return
  }
  var n = mkfastSession.placed
  mkfastSession = null
  player.tell('§e[MK] 已停止补全，共放置 ' + n + ' 块。')
}

ServerEvents.commandRegistry(event => {
  var L = event.commands.literal
  event.register(
    L('mkfast')
      .executes(ctx => {
        mkfastStart(ctx.source.playerOrException)
        return 1
      })
      .then(L('stop').executes(ctx => {
        mkfastStop(ctx.source.playerOrException)
        return 1
      }))
      .then(L('status').executes(ctx => {
        var s = mkfastSession
        if (!s) {
          ctx.source.playerOrException.tell('§7[MK] 当前没有补全任务。')
        } else {
          ctx.source.playerOrException.tell('§7[MK] 工地 ' + (s.ji + 1) + '/' + s.jobs.length + '，已放置 ' + s.placed + ' 块。')
        }
        return 1
      }))
  )
})

ServerEvents.tick(event => {
  if (mkfastSession) mkfastStep(event.server)
})
