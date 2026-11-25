// priority: 1000
// 远程狙击 Boss 补伤（TACZ 枪械）
//
// 为什么需要这个：
//   Cataclysm 的 Boss（IABoss_monster.hurt）里有一道射程闸门：
//       range = calculateRange(source)      // = source.getEntity() 与 Boss 的距离，没 entity 就是 -1
//       if (range >= RangeLimit() * 1.5) return false;   // 太远 → 这一枪完全不掉血
//   TACZ 的子弹算「有来源」的伤害，所以你在 Boss 接敌范围外开枪，服务端直接把整发伤害丢掉。
//
// 第二道坎：自然回血。
//   IABoss_monster.tick 里：
//       if (!isDeadOrDying() && self_regen <= 0 && NatureRegen() > 0 && getTarget() == null && tickCount % 20 == 0)
//           heal(NatureRegen());
//   也就是说 Boss 只要「没有仇恨目标」就每秒回血——在远处狙它，它一直没进战，等于打多少回多少，
//   看起来就是「显示命中、血条不动」。
//
// 这个脚本做的事：
//   1) Pre 记血量、Post 比对血量；若一枪没打掉血（被射程规则吞了），换**没有 entity 的伤害源**
//      （damageSources().generic()）重新结算：calculateRange 返回 -1 → 射程判定被跳过。
//   2) 每次补伤后把 Boss 的仇恨目标强制设为开枪的玩家，并维持一段时间（每 20 tick 刷一次），
//      这样 getTarget() != null → 自然回血被关掉，血条才会真的往下走。

var MKSnipeBefore = {}
var MKSnipeAggro = {}
var MKSnipeAggroTicks = 400 // 仇恨保持 400 tick ≈ 20 秒

function mksKey (entity) {
  return String(entity.id)
}

ForgeEvents.onEvent('com.tacz.guns.api.event.common.EntityHurtByGunEvent$Pre', event => {
  try {
    if (String(event.getLogicalSide()) !== 'SERVER') return
    var target = event.getHurtEntity()
    if (!target || !target.isAlive()) return
    MKSnipeBefore[mksKey(target)] = target.getHealth()
  } catch (err) {}
})

ForgeEvents.onEvent('com.tacz.guns.api.event.common.EntityHurtByGunEvent$Post', event => {
  try {
    if (String(event.getLogicalSide()) !== 'SERVER') return
    var target = event.getHurtEntity()
    if (!target || !target.isAlive()) return

    var key = mksKey(target)
    var before = MKSnipeBefore[key]
    delete MKSnipeBefore[key]
    if (before === undefined) return

    var attacker = event.getAttacker()

    // 正常吃到伤害也要把仇恨挂上（不然远处狙一发他又回血）
    if (attacker) mkSnipeAggro(target, attacker)

    // 正常吃到伤害 → 不补伤
    if (Math.abs(target.getHealth() - before) > 0.001) return

    var dmg = event.getAmount()
    if (!dmg || dmg <= 0) dmg = event.getBaseAmount()
    if (!dmg || dmg <= 0) return

    var level = target.level
    // 无来源伤害：calculateRange 会返回 -1，Boss 的「射程外免伤」直接失效
    var src = level.damageSources().generic()

    target.invulnerableTime = 0
    target.hurt(src, dmg)

    var after = target.getHealth()
    if (after < before) {
      console.info('[MKSNIPE] ' + String(target.type) + ' -' + (before - after).toFixed(1) + ' (' + before.toFixed(1) + ' -> ' + after.toFixed(1) + ')')
      if (attacker && attacker.isPlayer && attacker.isPlayer()) {
        attacker.displayClientMessage(Component.literal('§b远程命中 §f' + (before - after).toFixed(1)), true)
      }
    } else {
      console.info('[MKSNIPE] 仍然免疫 ' + String(target.type) + '（可能处于无敌/未唤醒阶段）')
      if (attacker && attacker.isPlayer && attacker.isPlayer()) {
        attacker.displayClientMessage(Component.literal('§c这一枪被免疫了（无敌/未唤醒）'), true)
      }
    }
  } catch (err) {
    console.info('[MKSNIPE] error ' + err)
  }
})

function mkSnipeAggro (boss, player) {
  try {
    boss.setLastHurtByMob(player)
    boss.setLastHurtByPlayer(player)
  } catch (err) {}
  try {
    // 关键：把「仇恨目标」也设上，Boss 的脱战自然回血条件 getTarget()==null 就不再成立
    boss.setTarget(player)
  } catch (err) {}
  MKSnipeAggro[String(boss.id)] = {
    boss: boss,
    player: player,
    left: MKSnipeAggroTicks
  }
}

// 每 20 tick 续一次仇恨，防止 Boss 因为距离太远自己把目标清掉
ServerEvents.tick(event => {
  var server = event.server
  if (server.tickCount % 20 !== 0) return
  var now = server.tickCount
  for (var k in MKSnipeAggro) {
    var rec = MKSnipeAggro[k]
    if (!rec) { delete MKSnipeAggro[k]; continue }
    rec.left -= 20
    if (rec.left <= 0) { delete MKSnipeAggro[k]; continue }
    try {
      if (!rec.boss || !rec.boss.isAlive()) { delete MKSnipeAggro[k]; continue }
      if (!rec.player || !rec.player.isAlive()) { delete MKSnipeAggro[k]; continue }
      rec.boss.setTarget(rec.player)
      rec.boss.setLastHurtByMob(rec.player)
    } catch (err) {
      delete MKSnipeAggro[k]
    }
  }
})
