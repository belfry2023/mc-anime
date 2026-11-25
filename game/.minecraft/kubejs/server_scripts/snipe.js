// priority: 1000
// 远程狙击 Boss 补伤（TACZ 枪械）
//
// 为什么需要这个：
//   Cataclysm 的 Boss（IABoss_monster.m_6469_ / hurt）里有一道射程闸门：
//       range = calculateRange(source)      // = source.getEntity() 与 Boss 的距离，没 entity 就是 -1
//       if (range >= RangeLimit() * 1.5) return false;   // 太远 → 这一枪完全不掉血
//   TACZ 的子弹算「有来源」的伤害，所以你在 Boss 接敌范围外开枪，服务端直接把整发伤害丢掉，
//   看起来就是「Boss 不进战、打不动」。
//
// 这个脚本做的事：
//   监听 TACZ 的 EntityHurtByGunEvent（Pre 记血量、Post 比对血量）。若一枪打上去血量没变化
//   （说明被上面的射程/阶段规则吞了），就换一个**没有 entity 的伤害源**（damageSources().generic()）
//   重新结算这一枪：calculateRange 返回 -1 → 射程判定被跳过，只剩 Boss 自己的 DamageCap 上限。
//   同时把仇恨挂到开枪的玩家身上，Boss 会转过头来找你。

var MKSnipeBefore = {}

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

    // 正常吃到伤害 → 不干预
    if (Math.abs(target.getHealth() - before) > 0.001) return

    var dmg = event.getAmount()
    if (!dmg || dmg <= 0) dmg = event.getBaseAmount()
    if (!dmg || dmg <= 0) return

    var attacker = event.getAttacker()
    var level = target.level
    // 无来源伤害：calculateRange 会返回 -1，Boss 的「射程外免伤」直接失效
    var src = level.damageSources().generic()

    target.invulnerableTime = 0
    target.hurt(src, dmg)

    if (attacker) {
      try {
        target.setLastHurtByMob(attacker)
        target.setLastHurtByPlayer(attacker)
      } catch (errAggro) {}
    }

    var after = target.getHealth()
    if (after < before) {
      console.info('[MKSNIPE] ' + String(target.type) + ' -' + (before - after).toFixed(1) + ' (' + before.toFixed(1) + ' -> ' + after.toFixed(1) + ')')
      if (attacker && attacker.isPlayer && attacker.isPlayer()) {
        attacker.displayClientMessage(Component.literal('§b远程命中 §f' + (before - after).toFixed(1)), true)
      }
    } else {
      console.info('[MKSNIPE] 仍然免疫 ' + String(target.type) + '（可能处于无敌/未唤醒阶段）')
    }
  } catch (err) {
    console.info('[MKSNIPE] error ' + err)
  }
})
