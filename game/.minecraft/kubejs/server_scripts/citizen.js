// /mkmaxcitizen —— 把公民的所有技能拉满
// 用法：
//   /mkmaxcitizen        把身边最近的公民技能全拉满
//   /mkmaxcitizen all    把所在殖民地所有公民全拉满
//   /mkmaxcitizen 30     把最近的公民技能设为 30（数字 1~99）

var MK_CIT_ENTITY = Java.loadClass('com.minecolonies.core.entity.citizen.EntityCitizen')
var MK_CIT_COLONY_MANAGER = Java.loadClass('com.minecolonies.api.colony.IColonyManager')
var MK_CIT_DEFAULT = 99

var mkCitizenLastError = ''

function mkCitFindColony(level, pos) {
  try {
    var mgr = MK_CIT_COLONY_MANAGER.getInstance()
    var c = mgr.getColonyByPosFromWorld(level, pos)
    if (c) return c
  } catch (e1) { mkCitizenLastError = 'getColonyByPosFromWorld: ' + e1 }
  try {
    var list = MK_CIT_COLONY_MANAGER.getInstance().getColonies(level)
    for (var i = 0; i < list.size(); i++) {
      var cc = list.get(i)
      if (cc && cc.isCoordInColony(level, pos)) return cc
    }
  } catch (e2) { mkCitizenLastError = 'getColonies: ' + e2 }
  return null
}

function mkCitNearest(player) {
  var best = null
  var bestD = 1e9
  var list = player.level.getEntitiesWithin(player.boundingBox.inflate(10))
  for (var i = 0; i < list.size(); i++) {
    var e = list.get(i)
    if (!(e instanceof MK_CIT_ENTITY)) continue
    var dx = e.x - player.x
    var dy = e.y - player.y
    var dz = e.z - player.z
    var d = dx * dx + dy * dy + dz * dz
    if (d < bestD) { bestD = d; best = e }
  }
  return best
}

function mkCitApply(cd, level) {
  var handler = cd.getCitizenSkillHandler()
  if (!handler) return 0
  var map = handler.getSkills()
  if (!map) return 0
  var it = map.values().iterator()
  var n = 0
  while (it.hasNext()) {
    var sd = it.next()
    try {
      sd.setLevel(level)
      sd.setExperience(0)
      n++
    } catch (e) { mkCitizenLastError = 'setLevel: ' + e }
  }
  try { cd.markDirty() } catch (e2) {}
  return n
}

function mkCitApplyAll(player, level) {
  var colony = mkCitFindColony(player.level, player.blockPosition())
  if (!colony) { player.tell('§c你不在任何殖民地领土内。' + (mkCitizenLastError ? ' §8(' + mkCitizenLastError + ')' : '')); return 0 }
  var citizens = colony.getCitizenManager().getCitizens()
  var done = 0
  for (var i = 0; i < citizens.size(); i++) {
    var cd = citizens.get(i)
    if (!cd) continue
    if (mkCitApply(cd, level) > 0) done++
  }
  player.tell('§a已把 §e' + done + ' §a名公民的全部技能设为 §e' + level + '§a。')
  return done
}

function mkCitApplyNearest(player, level) {
  var e = mkCitNearest(player)
  if (!e) { player.tell('§c10 格内没有找到公民，靠近一点再试。'); return 0 }
  var cd = null
  try { cd = e.getCitizenData() } catch (err) { cd = null }
  if (!cd) { player.tell('§c拿不到这个公民的数据。'); return 0 }
  var n = mkCitApply(cd, level)
  var name = '?'
  try { name = String(cd.getName()) } catch (err2) { try { name = String(e.getName().getString()) } catch (err3) {} }
  if (n > 0) player.tell('§a已把 §e' + name + ' §a的 §e' + n + ' §a项技能全部设为 §e' + level + '§a。')
  else player.tell('§c没改成任何技能。' + (mkCitizenLastError ? ' §8(' + mkCitizenLastError + ')' : ''))
  return n
}

ServerEvents.commandRegistry(event => {
  var L = event.commands.literal
  event.register(L('mkmaxcitizen')
    .executes(ctx => {
      mkCitApplyNearest(ctx.source.playerOrException, MK_CIT_DEFAULT)
      return 1
    })
    .then(L('all').executes(ctx => {
      mkCitApplyAll(ctx.source.playerOrException, MK_CIT_DEFAULT)
      return 1
    }))
    .then(L('10').executes(ctx => { mkCitApplyNearest(ctx.source.playerOrException, 10); return 1 }))
    .then(L('30').executes(ctx => { mkCitApplyNearest(ctx.source.playerOrException, 30); return 1 }))
    .then(L('50').executes(ctx => { mkCitApplyNearest(ctx.source.playerOrException, 50); return 1 }))
    .then(L('99').executes(ctx => { mkCitApplyNearest(ctx.source.playerOrException, 99); return 1 }))
  )
})
