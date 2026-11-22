// /mkbuild —— 创造模式下一键补齐殖民地建筑工所需材料
// 原理：建筑工小屋的「建造建筑物」界面列出的材料，来自 AbstractBuildingStructureBuilder.getNeededResources()。
//      只要把这些材料直接塞进建筑工小屋自己的箱子（getHandlers()），建筑工就不用等快递员送货，立刻开工。
// 用法：
//   /mkbuild        手动补一次（站在自己殖民地里）
//   /mkbuild auto   开关「每秒自动补一次」（只在创造模式生效）

var MK_BUILD_ABS_BUILDER = Java.loadClass('com.minecolonies.core.colony.buildings.AbstractBuildingStructureBuilder')
var MK_BUILD_COLONY_MANAGER = Java.loadClass('com.minecolonies.api.colony.IColonyManager')

var mkBuildAuto = false
var mkBuildLastError = ''
var mkBuildErrors = []

function mkBuildFindColony(level, pos) {
  try {
    var mgr = MK_BUILD_COLONY_MANAGER.getInstance()
    var c = mgr.getColonyByPosFromWorld(level, pos)
    if (c) return c
  } catch (e1) { mkBuildLastError = 'getColonyByPosFromWorld: ' + e1 }
  try {
    var mgr2 = MK_BUILD_COLONY_MANAGER.getInstance()
    var list = mgr2.getColonies(level)
    if (list) {
      for (var i = 0; i < list.size(); i++) {
        var cc = list.get(i)
        if (cc && cc.isCoordInColony(level, pos)) return cc
      }
    }
  } catch (e2) { mkBuildLastError = 'getColonies: ' + e2 }
  return null
}

function mkBuildStackOf(res) {
  try { return res.getItemStack().copy() } catch (e1) {}
  try { return res.getStack().copy() } catch (e2) {}
  try { return res.getItem().copy() } catch (e3) {}
  return null
}

function mkBuildPush(handlers, stack) {
  var s = stack
  var inserted = 0
  for (var h = 0; h < handlers.size(); h++) {
    var hh = handlers.get(h)
    for (var slot = 0; slot < hh.getSlots(); slot++) {
      if (s.getCount() <= 0) break
      var before = s.getCount()
      s = hh.insertItem(slot, s, false)
      inserted += before - s.getCount()
    }
    if (s.getCount() <= 0) break
  }
  return inserted
}

function mkBuildFill(player, quiet) {
  mkBuildErrors = []
  var level = player.level
  var pos = player.blockPosition()
  var colony = mkBuildFindColony(level, pos)
  if (!colony) {
    if (!quiet) player.tell('§c你不在任何殖民地领土内 —— 走到自己殖民地范围内再试。' + (mkBuildLastError ? ' §8(' + mkBuildLastError + ')' : ''))
    return 0
  }

  var total = 0
  var huts = 0
  var buildings = null
  try { buildings = colony.getBuildingManager().getBuildings() } catch (e0) { buildings = null }
  if (!buildings) { if (!quiet) player.tell('§c拿不到殖民地建筑列表。'); return 0 }

  var it = buildings.values().iterator()
  while (it.hasNext()) {
    var b = it.next()

    // 不按类名过滤：任何能给出「当前建造所需材料」的建筑都处理
    // （建筑工小屋 AbstractBuildingStructureBuilder 是主要来源，矿工小屋等同族也一并覆盖）
    var needed = null
    try { needed = b.getNeededResources() } catch (e1) { continue }
    if (!needed || needed.size() === 0) continue

    var handlers = null
    try { handlers = b.getHandlers() } catch (e2) { handlers = null }
    if (!handlers || handlers.size() === 0) continue

    var filled = 0
    var vals = needed.values().iterator()
    while (vals.hasNext()) {
      var res = vals.next()
      var missing = 0
      try {
        missing = res.getAmount() - res.getAvailable() - res.getAmountInDelivery()
        var mp = res.getMissingFromPlayer()
        if (mp > missing) missing = mp
      } catch (e3) { mkBuildErrors.push('res: ' + e3); continue }
      if (missing <= 0) continue

      var base = mkBuildStackOf(res)
      if (!base) continue
      var perStack = base.getMaxStackSize()
      var left = missing
      var guard = 0
      while (left > 0 && guard < 300) {
        guard++
        var give = Math.min(left, perStack)
        var s = base.copy()
        s.setCount(give)
        var got = mkBuildPush(handlers, s)
        if (got <= 0) break
        left -= got
        filled += got
      }
    }

    if (filled > 0) {
      huts++
      total += filled
    }
  }

  if (!quiet) {
    if (total > 0) player.tell('§a已把 §e' + total + ' §a个材料塞进 §e' + huts + ' §a个建筑工小屋的箱子，工人们马上就能开工。')
    else player.tell('§7没有需要补的材料（要么没在建，要么材料已经齐了）。')
    if (mkBuildErrors.length > 0) {
      player.tell('§8诊断（' + mkBuildErrors.length + ' 条）：')
      for (var i = 0; i < Math.min(3, mkBuildErrors.length); i++) player.tell('§8· ' + mkBuildErrors[i])
      console.info('[MKBUILD] errors: ' + mkBuildErrors.join(' | '))
    }
  }
  return total
}

ServerEvents.commandRegistry(event => {
  var L = event.commands.literal
  event.register(L('mkbuild')
    .executes(ctx => {
      var p = ctx.source.playerOrException
      mkBuildFill(p, false)
      return 1
    })
    .then(L('auto').executes(ctx => {
      mkBuildAuto = !mkBuildAuto
      ctx.source.playerOrException.tell('§a材料自动补齐：' + (mkBuildAuto ? '§2开' : '§7关'))
      return 1
    }))
  )
})

ServerEvents.tick(event => {
  if (!mkBuildAuto) return
  var server = event.server
  if (!server) return
  if (server.tickCount % 20 !== 0) return
  server.players.forEach(p => {
    var creative = true
    try { creative = p.isCreative() } catch (e) { creative = true }
    if (!creative) return
    try { mkBuildFill(p, true) } catch (err) { console.info('[MKBUILD] ' + err) }
  })
})
