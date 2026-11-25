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
var MKAnimMonster = Java.loadClass('com.github.L_Ender.cataclysm.entity.InternalAnimationMonster.IABossMonsters.IABoss_monster')

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

    mkSnipeForceVulnerable(target)
    target.invulnerableTime = 0
    target.hurt(src, dmg)

    var after = target.getHealth()
    if (after >= before) {
      // 最后一招：直接把血写下去（前面被无敌/未唤醒/招架挡住了）
      var hp = target.getHealth()
      var next = hp - dmg
      if (next <= 0) {
        // 让它按正常死亡流程走（掉落、死亡动画、boss 血条清理）
        try { target.hurt(level.damageSources().genericKill(), Math.max(1000, hp * 4)) } catch (errKill) {}
        after = target.getHealth()
        if (after >= before) {
          try { target.kill() } catch (errK) {}
          after = target.getHealth()
        }
      } else {
        try { target.setHealth(next); after = target.getHealth() } catch (errSet) {}
      }
      if (after < before) {
        console.info('[MKSNIPE] 强制扣血 ' + String(target.type) + ' -' + (before - after).toFixed(1))
      }
    }

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

// 把 Boss 强行拉成「可被伤害」状态：
//   - 清掉实体无敌标记（invulnerable）
//   - 唤醒睡眠/出生动画（Cataclysm 用 attackState 23/24 表示睡/醒）
//   - 清无敌帧
function mkSnipeForceVulnerable (boss) {
  try { if (boss.isInvulnerable()) boss.setInvulnerable(false) } catch (errInv) {}
  try {
    var state = boss.getAttackState()
    if (state >= 23 && state <= 24) boss.setAttackState(0)
  } catch (errState) {}
  try { boss.invulnerableTime = 0 } catch (errTime) {}
}

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

// ── Boss「永久可伤害」守卫 ────────────────────────────────────────────
// 用户要求：Cataclysm 的 Boss 不要有无敌 / 未唤醒 状态，任何距离、任何时机都能打。
// 每 tick 检查灾变实体，发现无敌就清掉；每 20 tick 额外把「睡眠/出生」动作状态（23/24）归零。
ForgeEvents.onEvent('net.minecraftforge.event.entity.living.LivingEvent$LivingTickEvent', event => {
  try {
    var e = event.getEntity()
    if (!e || !e.isAlive()) return
    if (!(e instanceof MKAnimMonster)) return

    if (e.isInvulnerable()) {
      e.setInvulnerable(false)
      try { e.invulnerableTime = 0 } catch (errT) {}
    }

    if (e.tickCount % 20 === 0) {
      var st = e.getAttackState()
      if (st >= 23 && st <= 24) e.setAttackState(0)
    }
  } catch (err) {}
})
