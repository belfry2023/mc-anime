// /mkundo —— 撤销 /mkfast 补全的方块
//
// 原理：/mkfast 只会把「当前方块 ≠ 蓝图目标方块」的位置补成蓝图方块。
//       所以反向撤销就是：对同一批工单蓝图位置，凡是「当前方块 == 蓝图目标方块」的，
//       说明它现在正是补全后的样子 —— 直接改回空气，让工地回到「待建」状态。
//       建筑工随后会按图纸重新正常施工（也可以直接在建筑 GUI 里打包/取消这个工单）。
//
// 安全措施：
//   * 只处理「已认领（isClaimed）」工单的蓝图范围，不动其它地方；
//   * 跳过 air 目标、跳过所有 blockhut* 方块（不删建筑核心方块）；
//   * 每 tick 最多改 MKUNDO_BUDGET 块，避免上次那种「单 tick 上万次改动」把渲染线程搞崩；
//   * 默认只统计（dry run），加 go 才真删。

var MKUNDO_COLONY = Java.loadClass('com.minecolonies.api.colony.IColonyManager')

var MKUNDO_BUDGET = 300     // 每 tick 最多清除多少块
var MKUNDO_SCAN = 4000      // 每 tick 最多检查多少个位置

var mkundoSession = null

function mkundoColony(level, pos) {
  try {
    var c = MKUNDO_COLONY.getInstance().getColonyByPosFromWorld(level, pos)
    if (c) return c
  } catch (e0) {}
  try {
    var all = MKUNDO_COLONY.getInstance().getColonies(level)
    for (var i = 0; i < all.size(); i++) {
      var c2 = all.get(i)
      if (c2 && c2.isCoordInColony(level, pos)) return c2
    }
  } catch (e1) {}
  return null
}

function mkundoCollect(colony) {
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
          cleared: 0
        })
      } catch (eSkip) {}
    }
  } catch (eAll) {
    console.info('[MKUNDO] 读取工单失败: ' + eAll)
  }
  return jobs
}

function mkundoIsAir(state) {
  return state === 'minecraft:air' || state === 'minecraft:cave_air' || state === 'minecraft:void_air'
}

function mkundoSkipTarget(state) {
  return state.indexOf(':blockhut') > 0
}

function mkundoFinish(s, player) {
  var msg = '§a[MK] 撤销完成：清除了 ' + s.cleared + ' 块（恢复成待建状态）。'
  try {
    player.tell(msg)
  } catch (e) {}
  console.info('[MKUNDO] done, cleared=' + s.cleared)
  mkundoSession = null
}

function mkundoStep(server) {
  var s = mkundoSession
  if (!s) return
  var player = s.player
  if (!player || !player.isAlive()) {
    mkundoSession = null
    return
  }
  var level = player.level
  var dim = String(level.dimension)
  var budget = MKUNDO_BUDGET
  var scanned = 0
  var cleared = 0

  while (scanned < MKUNDO_SCAN && budget > 0) {
    if (s.ji >= s.jobs.length) {
      s.cleared += cleared
      mkundoFinish(s, player)
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
      if (mkundoIsAir(state)) continue
      if (mkundoSkipTarget(state)) continue
      var wp = job.loc.offset(key).subtract(job.primary)
      var x = wp.getX()
      var y = wp.getY()
      var z = wp.getZ()
      var cur = ''
      try {
        cur = String(level.getBlock(x, y, z).blockState)
      } catch (eCur) {}
      if (cur !== state) continue
      server.runCommandSilent('execute in ' + dim + ' run setblock ' + x + ' ' + y + ' ' + z + ' air')
      cleared++
      budget--
      job.cleared++
    } catch (eOne) {
      s.errors = (s.errors || 0) + 1
      if (s.errors <= 3) console.info('[MKUNDO] 清除失败: ' + eOne)
    }
  }

  s.cleared += cleared

  if (server.tickCount % 20 === 0) {
    try {
      var remain = 0
      for (var i = s.ji; i < s.jobs.length; i++) remain += s.jobs[i].total - s.jobs[i].idx
      player.tell('§7[MK] 撤销中… 已清除 ' + s.cleared + ' 块，剩余检查约 ' + remain + ' 个位置')
    } catch (eTell) {}
  }
}

function mkundoStart(player) {
  if (mkundoSession) {
    player.tell('§e[MK] 已经有撤销任务在跑，先 /mkundo stop。')
    return
  }
  var level = player.level
  var colony = mkundoColony(level, player.blockPosition())
  if (!colony) {
    player.tell('§c[MK] 你不在任何殖民地领土内。')
    return
  }
  var jobs = mkundoCollect(colony)
  if (jobs.length === 0) {
    player.tell('§e[MK] 没有找到「已认领 + 有蓝图」的工单，没什么可撤销的。')
    return
  }
  var total = 0
  for (var i = 0; i < jobs.length; i++) total += jobs[i].total
  mkundoSession = { player: player, jobs: jobs, ji: 0, cleared: 0, errors: 0 }
  player.tell('§e[MK] 开始撤销 ' + jobs.length + ' 个工地（共 ' + total + ' 个蓝图位置）。')
  player.tell('§7[MK] 如果这栋楼你想整个放弃：撤销完后到建筑 GUI 里把这栋「打包/拆除」掉最干净。')
  console.info('[MKUNDO] start jobs=' + jobs.length + ' positions=' + total)
}

function mkundoStop(player) {
  if (!mkundoSession) {
    player.tell('§7[MK] 当前没有撤销任务。')
    return
  }
  var n = mkundoSession.cleared
  mkundoSession = null
  player.tell('§e[MK] 已停止撤销，共清除 ' + n + ' 块。')
}

ServerEvents.commandRegistry(event => {
  var L = event.commands.literal
  event.register(
    L('mkundo')
      .executes(ctx => {
        mkundoStart(ctx.source.playerOrException)
        return 1
      })
      .then(L('go').executes(ctx => {
        mkundoStart(ctx.source.playerOrException)
        return 1
      }))
      .then(L('stop').executes(ctx => {
        mkundoStop(ctx.source.playerOrException)
        return 1
      }))
      .then(L('status').executes(ctx => {
        var s = mkundoSession
        var p = ctx.source.playerOrException
        if (!s) p.tell('§7[MK] 当前没有撤销任务。')
        else p.tell('§7[MK] 工地 ' + (s.ji + 1) + '/' + s.jobs.length + '，已清除 ' + s.cleared + ' 块。')
        return 1
      }))
  )
})

ServerEvents.tick(event => {
  if (mkundoSession) mkundoStep(event.server)
})
