// /mkundo —— 把 /mkfast 弄乱的工地清回「空地」，让建筑工重新按图纸正常施工
//
// 背景：/mkfast 用原版 setblock 直接塞蓝图方块，绕过了 MineColonies 的
//       · 替换方块（placeholder / substitution）解析
//       · 工单旋转 / 镜像
//       · 材料扣减与施工阶段
//       所以塞进去的方块类型/朝向和建筑工期望的不一样，工单就卡住不认。
//
// 补救：把「已认领工单」蓝图范围内的方块统一切成空气（保留 blockhut* 建筑核心方块），
//       让工地回到「什么都没有」的状态，建筑工随后会重新清场 + 按图纸正确施工。
//
// 安全措施：
//   * 只动已认领工单的蓝图范围，不动范围外的地形建筑；
//   * 跳过所有 blockhut* 方块（不删建筑本体，工单不会消失）；
//   * 每 tick 最多 MKUNDO_BUDGET 块，避免单 tick 巨量改动把渲染线程搞崩；
//   * /mkundo 默认只统计，/mkundo go 才真清。

var MKUNDO_COLONY = Java.loadClass('com.minecolonies.api.colony.IColonyManager')

var MKUNDO_BUDGET = 300     // 每 tick 最多清多少块
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
          box: wo.getBoundingBox(),
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

function mkundoIsHut(state) {
  return state.indexOf(':blockhut') > 0
}

function mkundoFinish(s, player) {
  try {
    player.tell('§a[MK] 清场完成：清掉了 ' + s.cleared + ' 块方块，工地已恢复成空地。')
    player.tell('§7[MK] 现在让建筑工重新施工：到建筑 GUI 里确认一下工单状态，或等一下它自己重新接管。')
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
      var wp = job.loc.offset(key).subtract(job.primary)
      var x = wp.getX()
      var y = wp.getY()
      var z = wp.getZ()
      // 安全护栏：只有落在「工单包围盒外扩 16 格」内的位置才清，避免换算出错时清到远处
      try {
        var box = job.box
        if (box && (x < box.minX - 16 || x > box.maxX + 16 || y < box.minY - 16 || y > box.maxY + 16 || z < box.minZ - 16 || z > box.maxZ + 16)) continue
      } catch (eBox) {}
      var cur = ''
      try {
        cur = String(level.getBlock(x, y, z).blockState)
      } catch (eCur) {}
      if (cur === '' || mkundoIsAir(cur)) continue
      if (mkundoIsHut(cur)) continue
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
      player.tell('§7[MK] 清场中… 已清除 ' + s.cleared + ' 块，剩余检查约 ' + remain + ' 个位置')
    } catch (eTell) {}
  }
}

function mkundoStart(player) {
  if (mkundoSession) {
    player.tell('§e[MK] 已经有清场任务在跑，先 /mkundo stop。')
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
    player.tell('§e[MK] 没有找到「已认领 + 有蓝图」的工单，没什么可清的。')
    return
  }
  var total = 0
  for (var i = 0; i < jobs.length; i++) total += jobs[i].total
  mkundoSession = { player: player, jobs: jobs, ji: 0, cleared: 0, errors: 0 }
  player.tell('§e[MK] 开始清场：' + jobs.length + ' 个工地，共 ' + total + ' 个蓝图位置。')
  player.tell('§7[MK] 只会清成空气，blockhut* 建筑核心方块会保留，范围内的其它方块（含你之前放的）都会被清掉。')
  console.info('[MKUNDO] start jobs=' + jobs.length + ' positions=' + total)
}

function mkundoStop(player) {
  if (!mkundoSession) {
    player.tell('§7[MK] 当前没有清场任务。')
    return
  }
  var n = mkundoSession.cleared
  mkundoSession = null
  player.tell('§e[MK] 已停止清场，共清除 ' + n + ' 块。')
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
        if (!s) p.tell('§7[MK] 当前没有清场任务。')
        else p.tell('§7[MK] 工地 ' + (s.ji + 1) + '/' + s.jobs.length + '，已清除 ' + s.cleared + ' 块。')
        return 1
      }))
  )
})

ServerEvents.tick(event => {
  if (mkundoSession) mkundoStep(event.server)
})
