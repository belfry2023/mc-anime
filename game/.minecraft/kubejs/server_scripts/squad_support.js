// priority: 35
;(function () {
  var s = global.mkSquad,
    j = global.mkJutsu
  var A = Java.loadClass('net.minecraft.world.entity.ai.attributes.Attributes'),
    T = j.damageTags
  var Types = Java.loadClass('net.minecraft.world.damagesource.DamageTypes')
  var Value = Java.loadClass('net.minecraft.network.syncher.SynchedEntityData$DataValue')
  var ByteValue = Java.loadClass('java.lang.Byte')
  var Meta = Java.loadClass('net.minecraft.network.protocol.game.ClientboundSetEntityDataPacket')
  var Serial = Java.loadClass('net.minecraft.network.syncher.EntityDataSerializers')
  var flags = Serial.BYTE.createAccessor(0)
  var Tame = Java.loadClass('net.minecraft.world.entity.TamableAnimal')
  var clock = e => j.time(e)
  function ally(p, e) {
    if (!e) return false
    if (e.is(p) || p.isOnSameTeam(e)) return true
    if (e instanceof Tame || e.tags.contains('mk_shikigami')) {
      var owner = e.tags.contains('mk_shikigami')
        ? s.lookup(e.level, e.persistentData.getString('mkOwner'))
        : e.getOwner()
      return owner && (p.is(owner) || p.isOnSameTeam(owner))
    }
    return false
  }
  // Only the recipients' tracked-entity flags change. Resend all current native bits on expiry.
  function outline(p, e, on) {
    var bits = Number(e.getEntityData().get(flags))
    var value = ByteValue.valueOf(String(on ? bits | 64 : bits))
    p.connection.send(new Meta(e.id, [new Value(0, Serial.BYTE, value)]))
  }
  var previous = global.mkSeenByPlayer || {}
  global.mkSeenByPlayer = previous
  function survey(server) {
    var seen = {}
    server.players.forEach(owner => {
      var fox = s.get(owner, 'fox')
      if (!j.active(fox)) return
      var look = fox.getLookAngle()
      var contacts = j
        .area(fox, fox.x, fox.y, fox.z, 36)
        .filter(e => fox.hasLineOfSight(e) && (e.x - fox.x) * look.x() + (e.z - fox.z) * look.z() >= -0.1)
      if (!contacts.length) return
      global.mkQuestMark(owner, 'sight')
      var targets = contacts.slice().sort((a, b) => fox.distanceToEntitySqr(a) - fox.distanceToEntitySqr(b))
      var locked = s.lookup(fox.level, fox.persistentData.getString('mkLock'))
      if (!locked || !j.hostile(fox, locked) || fox.distanceToEntity(locked) > 40)
        fox.persistentData.putString('mkLock', String(targets[0].uuid))
      server.players.forEach(p => {
        if (!p.level.equals(fox.level) || !ally(owner, p)) return
        var key = String(p.uuid)
        if (!seen[key]) seen[key] = {}
        contacts.forEach(e => {
          seen[key][String(e.uuid)] = true
          outline(p, e, true)
        })
      })
      // Owned companions and scoreboard allies can acquire a contact from the fox.
      fox.level.getEntitiesWithin(fox.boundingBox.inflate(64)).forEach(m => {
        if (!(m instanceof j.mob) || !ally(owner, m) || m.getTarget() || !m.isAlive()) return
        if (m instanceof Tame && m.isOrderedToSit()) return
        m.setTarget(targets[0])
      })
    })
    server.players.forEach(p => {
      var k = String(p.uuid),
        old = previous[k] || {},
        next = seen[k] || {}
      Object.keys(old).forEach(id => {
        if (!next[id]) {
          var e = s.lookup(p.level, id)
          if (e) outline(p, e, false)
        }
      })
      previous[k] = next
    })
  }
  function echo(e, attacker, amount) {
    attacker.server.players.forEach(owner => {
      var fox = s.get(owner, 'fox')
      if (
        !j.active(fox) ||
        !owner.level.equals(attacker.level) ||
        fox.is(attacker) ||
        !ally(owner, attacker) ||
        fox.distanceToEntity(attacker) > 64
      )
        return
      var lock = s.lookup(fox.level, fox.persistentData.getString('mkLock')) || j.nearest(fox, 36, true)
      if (!lock || !j.hostile(fox, lock) || fox.distanceToEntity(lock) > 40) return
      j.fx(fox, 'ELECTRIC_SPARK', lock.x, lock.y + 1, lock.z, 6, 0.25)
      j.hit(fox, lock, amount * 0.1, 'echo')
    })
  }
  function damageId(src) {
    return String(src.typeHolder().unwrapKey().get().location())
  }
  function magic(src, id) {
    return (
      src.is(Types.MAGIC) ||
      src.is(Types.INDIRECT_MAGIC) ||
      src.is(Types.SONIC_BOOM) ||
      id === 'mk:ranged' ||
      id === 'mk:cleave' ||
      id === 'mk:echo' ||
      id === 'mk:domain' ||
      /spell|magic|jujutsu|indirect_magic|dragon_breath|wither_skull/.test(id)
    )
  }
  function isRanged(src, id, target) {
    return (
      src.is(T.IS_PROJECTILE) ||
      src.getImmediate() instanceof j.projectile ||
      id === 'mk:ranged' ||
      /bullet|gunfire/.test(id) ||
      (magic(src, id) && src.getActual() && src.getActual().distanceToEntity(target) > 4)
    )
  }
  function physical(src, id) {
    return (
      !magic(src, id) &&
      !src.is(T.IS_FIRE) &&
      !src.is(T.IS_FREEZING) &&
      !src.is(T.IS_LIGHTNING) &&
      (src.is(T.IS_PROJECTILE) ||
        src.is(T.IS_EXPLOSION) ||
        src.is(T.IS_FALL) ||
        !!src.getActual() ||
        /cactus|cramming|in_wall|falling|stalagmite|fly_into_wall|sweet_berry_bush/.test(id))
    )
  }
  function summon(saint, kind) {
    var d = saint.persistentData,
      key = 'mkSummon_' + kind,
      now = clock(saint)
    if (d.contains(key)) {
      var id = String(d.getString(key)),
        r = saint.server.persistentData
      if (!r.contains('mkLost_' + id)) return
      d.remove(key)
      d.putLong('mkReturn_' + kind, r.getLong('mkLost_' + id) + 600)
      r.remove('mkLost_' + id)
    }
    if (now < d.getLong('mkReturn_' + kind)) return
    var e = saint.level.createEntity('minecraft:iron_golem'),
      spot = s.safeSpot(e, saint, 3)
    if (!spot) return
    e.setPos(spot[0], spot[1], spot[2])
    e.setPlayerCreated(true)
    e.setPersistenceRequired()
    e.setCustomName(Text.of(kind === 'wheel' ? '魔虚罗' : '融合怪·颚吐'))
    e.setCustomNameVisible(true)
    e.addTag('mk_shikigami')
    e.persistentData.putString('mkSpirit', kind)
    e.persistentData.putString('mkSaint', String(saint.uuid))
    e.persistentData.putString('mkOwner', s.ownerOf(saint))
    e.getAttribute(A.MAX_HEALTH).setBaseValue(kind === 'wheel' ? 720 : 480)
    e.getAttribute(A.ATTACK_DAMAGE).setBaseValue(kind === 'wheel' ? 86 : 36)
    e.setHealth(e.maxHealth)
    if (saint.level.addFreshEntity(e)) d.putString(key, String(e.uuid))
  }
  // A summoned golem has its own chunk and dimension. Recover that same UUID after the party moves.
  function findSpirit(saint, kind) {
    var d = saint.persistentData,
      id = d.getString('mkSummon_' + kind)
    if (!id) return null
    var spirit = s.lookup(saint.level, id),
      location = 'mkSpiritAt_' + kind,
      now = clock(saint)
    if (!spirit && d.contains(location) && now >= d.getLong('mkFind_' + kind)) {
      d.putLong('mkFind_' + kind, now + 100)
      var last = d.getCompound(location),
        previousLevel = saint.server.getLevel(String(last.getString('dim')))
      if (!previousLevel) return null
      previousLevel.getChunk(last.getInt('cx'), last.getInt('cz'))
      var found = s.lookup(previousLevel, id)
      if (!found || !found.isAlive()) return null
      if (previousLevel.equals(saint.level)) spirit = found
      else {
        var spot = s.safeSpot(found, saint, 3)
        if (!spot) return null
        saint.server.runCommandSilent(
          'execute in ' +
            previousLevel.dimension +
            ' as ' +
            id +
            ' in ' +
            saint.level.dimension +
            ' run tp @s ' +
            spot.join(' ')
        )
        spirit = s.lookup(saint.level, id)
      }
    }
    if (spirit) {
      var pos = NBT.compoundTag()
      pos.putString('dim', String(spirit.level.dimension))
      pos.putInt('cx', Math.floor(spirit.x) >> 4)
      pos.putInt('cz', Math.floor(spirit.z) >> 4)
      d.put(location, pos)
    }
    return spirit
  }
  function spirits(saint, target) {
    var d = saint.persistentData,
      now = clock(saint)
    ;['wheel', 'fusion'].forEach(kind => {
      if (target && !j.locked(saint)) summon(saint, kind)
      var spirit = findSpirit(saint, kind)
      if (!spirit || !spirit.isAlive()) return
      if (spirit.distanceToEntity(saint) > 18) {
        var spot = s.safeSpot(spirit, saint, 3)
        if (spot) spirit.teleportTo(spot[0], spot[1], spot[2])
      }
      if (target) spirit.setTarget(target)
      if (kind === 'wheel') spirit.heal(120)
      else {
        j.area(saint, spirit.x, spirit.y, spirit.z, 14).forEach(e => {
          if (e instanceof j.mob) e.setTarget(spirit)
        })
        saint.heal(36)
        d.putInt('mkEnergy', Math.min(j.capacity(saint), d.getInt('mkEnergy') + 22))
        if (d.getLong('mkBurnEnd') > now && d.getLong('mkDomainEnd') <= now)
          d.putLong('mkBurnEnd', Math.max(now, d.getLong('mkBurnEnd') - 10))
      }
    })
  }
  function tick(ev) {
    var e = ev.entity
    if (e.persistentData.contains('mkStillEnd')) j.stasis(ev)
    var role = s.roleOf(e)
    if (!role || !s.roles[role] || !j.active(e)) return
    var now = clock(e),
      d = e.persistentData
    if (role === 'star' || role === 'saint') j.advance(e)
    if (now % 4 !== 0 && !(role === 'magic' && now % 2 === 0)) return
    var p = e.getOwner()
    if (!p || !p.isPlayer()) return
    var target = j.nearest(e, role === 'magic' ? 26 : 36, true)
    if (now % 20 === 0 && (role === 'saint' || role === 'star')) {
      d.putInt('mkEnergy', Math.min(j.capacity(e), d.getInt('mkEnergy') + (role === 'star' ? 240 : 8)))
      if (role === 'saint') spirits(e, target)
    }
    if (!target) return
    var distance = e.distanceToEntity(target)
    if (role === 'magic') {
      if (distance > 3.2) {
        if (now % 8 === 0) e.getNavigation().moveTo(target, 1.25)
        return
      }
      if (d.getLong('mkSwing') <= now) {
        d.putLong('mkSwing', now + (d.getLong('mkHaste') > now ? 4 : 8))
        e.swing('main_hand')
        j.hit(e, target, e.getAttributeValue(A.ATTACK_DAMAGE), 'blade')
      }
      return
    }
    if (role === 'fox' || j.locked(e) || d.getBoolean('mkManual')) return
    if (
      now % 20 === 0 &&
      distance <= (role === 'saint' ? 18 : 24) &&
      (j.boss(target) || j.area(e, e.x, e.y, e.z, 14).length >= 5) &&
      j.domain(e)
    )
      return
    if (d.contains('mkPending') || now < d.getLong('mkNext')) return
    if (role === 'saint') j.cast(e, distance <= 3.2 ? 'cleave' : 'dismantle', target)
    if (role === 'star') {
      var seq = ['blue', 'red', 'purple'],
        n = d.getInt('mkRotation')
      if (distance > 24 && now >= d.getLong('mkBlinkAt') && j.cast(e, 'blink', target)) {
        d.putLong('mkBlinkAt', now + 120)
        return
      }
      if (j.cast(e, seq[n % 3], target)) d.putInt('mkRotation', (n + 1) % 3)
    }
  }
  function attack(ev) {
    var e = ev.entity,
      src = ev.source,
      from = src.getActual(),
      role = s.roleOf(e),
      id = damageId(src)
    if (from && from.persistentData.getLong('mkStillEnd') > clock(from)) {
      ev.setCanceled(true)
      return
    }
    if (from && s.roleOf(from) === 'magic' && (src.is(Types.MOB_ATTACK) || isRanged(src, id, e))) {
      ev.setCanceled(true)
      return
    }
    if (src.is(Types.GENERIC_KILL) || src.is(Types.FELL_OUT_OF_WORLD)) return
    if (role === 'star' && !j.burnedOut(e) && physical(src, id)) {
      ev.setCanceled(true)
      return
    }
    if (role !== 'magic') return
    if (magic(src, id) || isRanged(src, id, e)) {
      ev.setCanceled(true)
      return
    }
    if (!from || !j.hostile(e, from) || id === 'mk:counter') return
    var dodge = Math.random() < 0.9,
      block = Math.random() < 0.9
    if (dodge) e.persistentData.putLong('mkHaste', clock(e) + 60)
    if (dodge || block) ev.setCanceled(true)
    if (block && e.distanceToEntity(from) <= 4)
      j.hit(e, from, 1.5 * e.getAttributeValue(A.ATTACK_DAMAGE), 'counter')
  }
  function hurt(ev) {
    var e = ev.entity,
      d = e.persistentData
    if (String(d.getString('mkSpirit')) === 'wheel' && ev.amount >= 320) {
      d.putLong('mkBroken', clock(e) + 20)
      ev.setAmount(Math.max(ev.amount, e.maxHealth * 4))
    }
  }
  function damage(ev) {
    var src = ev.source,
      m = src.getActual()
    if (!m || !m.isLiving() || ev.amount <= 0) return
    var id = damageId(src)
    if (id !== 'mk:echo' && isRanged(src, id, ev.entity)) echo(ev.entity, m, ev.amount)
  }
  function death(ev) {
    var e = ev.entity,
      d = e.persistentData,
      now = clock(e)
    if (e.tags.contains('mk_shikigami')) {
      if (
        String(d.getString('mkSpirit')) === 'wheel' &&
        d.getLong('mkBroken') <= now &&
        !ev.source.is(Types.GENERIC_KILL) &&
        !ev.source.is(Types.FELL_OUT_OF_WORLD)
      ) {
        ev.setCanceled(true)
        e.setHealth(1)
        return
      }
      e.server.persistentData.putLong('mkLost_' + e.uuid, now)
    }
    if (s.roleOf(e) === 'saint' && !j.phase(e)) {
      ev.setCanceled(true)
      d.putBoolean('mkPhase2', true)
      e.setHealth(e.maxHealth)
      d.putInt('mkEnergy', 240)
      d.putLong('mkNext', now)
      var boundary = Math.max(now, d.getLong('mkDomainEnd'))
      if (d.getLong('mkBurnEnd') > boundary)
        d.putLong('mkBurnEnd', boundary + Math.ceil((d.getLong('mkBurnEnd') - boundary) / 2))
      var base = e.getAttribute(A.ATTACK_DAMAGE)
      base.setBaseValue(s.roles.saint.atk * 2)
      if (e.getOwner()) e.getOwner().tell('§c圣女折断了第二枚封印。二阶段已开启。')
      return
    }
    var a = ev.source.getActual()
    if (a && j.boss(e) && j.hostile(a, e, true)) {
      var p = a.isPlayer()
        ? a
        : s.roleOf(a)
          ? a.getOwner()
          : a.tags.contains('mk_shikigami')
            ? s.lookup(a.level, a.persistentData.getString('mkOwner'))
            : null
      if (p && p.isPlayer()) global.mkQuestMark(p, 'boss')
    }
  }
  function change(ev) {
    var e = ev.entity,
      v = ev.getNewTarget()
    if (
      e.tags.contains('mk_shikigami') &&
      v &&
      !j.hostile(s.lookup(e.level, e.persistentData.getString('mkSaint')) || e, v)
    )
      ev.setNewTarget(null)
  }
  global.mkCombatHooks = {
    tick: tick,
    attack: attack,
    hurt: hurt,
    damage: damage,
    death: death,
    target: change
  }
  ServerEvents.tick(ev => {
    if (ev.server.tickCount % 10 === 0) survey(ev.server)
  })
  PlayerEvents.loggedOut(ev => {
    delete previous[String(ev.player.uuid)]
  })
})()
