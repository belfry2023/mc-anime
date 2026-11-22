// ===== /mkresearch —— 一次性解锁殖民地「大学研究」里的所有项目 =====
// 用途：正常流程里研究项目要求大学达到一定等级、消耗材料、还要排队等时间。
//       这个命令直接把当前殖民地的研究树里所有项目标记为「已完成」，
//       效果会立即生效（不必等研究进度，也不受大学等级限制）。
// 用法：
//   /mkresearch          解锁所有分支的所有研究项目（站在殖民地范围内用）
//   /mkresearch status   只看进度（已完成 / 总数）
// 说明：
//   - 必须在你自己的殖民地领土内执行（用 /mc colony info 可以查殖民地 id）。
//   - 走的是 MineColonies 自己的 IGlobalResearchTree + ILocalResearchTree.finishResearch，
//     等价于「研究完成那一刻」，所以加成属性/解锁内容都会正常应用。
//   - 研究是有存档数据的，改完就永久生效；想撤销要在大学里手动「取消研究」（会消耗古代卷轴）。
//   - 若只想「快速研究」而不想全解锁：把研究放进大学，保持创造模式即可
//     （配置 researchcreativecompletion 默认就是 true，创造模式下研究会瞬完成）。

var GlobalResearchTreeClass = Java.loadClass('com.minecolonies.api.research.IGlobalResearchTree')
var ColonyManagerClass = Java.loadClass('com.minecolonies.api.colony.IColonyManager')

// 取玩家所在位置的殖民地（返回 null 表示不在任何殖民地里）
var mkResearchLastError = ''
function mkResearchColony(player) {
  mkResearchLastError = ''
  var level = null
  try {
    level = player.level
  } catch (e0) {
    mkResearchLastError = '取 level 失败: ' + e0
    return null
  }
  var pos = null
  try {
    pos = player.blockPosition()
  } catch (e1) {
    mkResearchLastError = '取坐标失败: ' + e1
    return null
  }

  var mgr = ColonyManagerClass.getInstance()

  // 方案一：按坐标直接问管理器
  try {
    var c = mgr.getColonyByPosFromWorld(level, pos)
    if (c) return c
  } catch (e2) {
    mkResearchLastError = 'getColonyByPosFromWorld: ' + e2
  }

  // 方案二：列出这个世界所有殖民地，自己判断坐标在谁的领土里
  try {
    var list = mgr.getColonies(level)
    for (var i = 0; i < list.size(); i++) {
      var col = list.get(i)
      try {
        if (col.isCoordInColony(level, pos)) return col
      } catch (e3) {}
    }
    if (list.size() > 0) mkResearchLastError += '（本世界有 ' + list.size() + ' 个殖民地，但坐标不在任何一个领土内）'
    else mkResearchLastError += '（本世界没有已加载的殖民地）'
  } catch (e4) {
    mkResearchLastError += ' getColonies: ' + e4
  }

  console.info('[MKRESEARCH] 找殖民地失败: ' + mkResearchLastError)
  return null
}

// 把某个全局研究的所有子研究压进队列
function mkResearchPushChildren(res, queue) {
  try {
    var kids = res.getChildren()
    for (var i = 0; i < kids.size(); i++) queue.push(kids.get(i))
  } catch (e) {}
}

// 遍历整棵研究树；complete=true 时逐个标记完成
function mkResearchWalk(colony, complete) {
  var result = { total: 0, done: 0, added: 0, failed: 0 }
  var global = GlobalResearchTreeClass.getInstance()
  var tree = colony.getResearchManager().getResearchTree()
  var branches = global.getBranches()

  for (var bi = 0; bi < branches.size(); bi++) {
    var branch = branches.get(bi)
    var queue = []
    var roots = global.getPrimaryResearch(branch)
    for (var ri = 0; ri < roots.size(); ri++) queue.push(roots.get(ri))

    var seen = {}
    while (queue.length > 0) {
      var rid = queue.shift()
      var key = String(rid)
      if (seen[key]) continue
      seen[key] = true

      var res = null
      try { res = global.getResearch(branch, rid) } catch (e1) {}
      if (!res) {
        try { res = global.getResearch(rid) } catch (e2) {}
      }

      result.total++
      var already = false
      try { already = tree.isComplete(rid) } catch (e3) { already = false }

      if (already) {
        result.done++
      } else if (complete) {
        try {
          // 先在建研究表里登记（等级/材料等要求在这里不校验，finishResearch 直接结算）
          if (res) res.startResearch(tree)
          tree.finishResearch(rid)
          result.done++
          result.added++
        } catch (e4) {
          result.failed++
          console.info('[MKRESEARCH] 解锁失败 ' + key + ': ' + e4)
        }
      }

      if (res) mkResearchPushChildren(res, queue)
    }
  }

  if (complete) {
    try { colony.getResearchManager().markDirty() } catch (e5) {}
    try { colony.markDirty() } catch (e6) {}
  }
  return result
}

function mkResearchRun(player, complete) {
  var colony = mkResearchColony(player)
  if (!colony) {
    player.tell('§c[研究] 没找到你脚下的殖民地。')
    if (mkResearchLastError) player.tell('§7诊断：' + mkResearchLastError)
    player.tell('§7请站在自己殖民地领土内（市政厅周围的领地范围）再执行；/mc colony info 可以看殖民地范围。')
    return 0
  }
  var name = '?'
  try { name = String(colony.getName()) } catch (e) {}
  var st = mkResearchWalk(colony, complete)

  if (complete) {
    player.tell('§a[研究] 殖民地 §e' + name + '§a 的研究已全部解锁：新解锁 §e' + st.added +
      '§a 项，之前已完成 §e' + st.done + '§a 项（共 ' + st.total + ' 项）' +
      (st.failed > 0 ? '，§c失败 ' + st.failed + ' 项（详见日志）' : ''))
    player.tell('§7提示：打开市政厅/大学的「研究」界面刷新一下，或退出重进世界，加成即生效。')
  } else {
    player.tell('§e[研究] 殖民地 ' + name + '：已完成 §a' + st.done + '§e / 共 ' + st.total + ' 项。')
  }
  return 1
}

ServerEvents.commandRegistry(function (event) {
  var C = event.commands

  function pOf(ctx) { return ctx.source.player }

  event.register(
    C.literal('mkresearch')
      .then(C.literal('status').executes(function (ctx) {
        var p = pOf(ctx)
        if (!p) return 0
        return mkResearchRun(p, false)
      }))
      .executes(function (ctx) {
        var p = pOf(ctx)
        if (!p) return 0
        return mkResearchRun(p, true)
      })
  )
})
