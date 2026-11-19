// priority: 50
;(function () {
  var team = global.mkSquad,
    Living = Java.loadClass('net.minecraft.world.entity.LivingEntity')
  var Mob = Java.loadClass('net.minecraft.world.entity.Mob'),
    Enemy = Java.loadClass('net.minecraft.world.entity.monster.Enemy')
  var Tame = Java.loadClass('net.minecraft.world.entity.TamableAnimal'),
    Projectile = Java.loadClass('net.minecraft.world.entity.projectile.Projectile')
  var Reg = Java.loadClass('net.minecraft.core.registries.Registries'),
    Key = Java.loadClass('net.minecraft.resources.ResourceKey')
  var Tag = Java.loadClass('net.minecraft.tags.TagKey'),
    Types = Java.loadClass('net.minecraft.tags.DamageTypeTags')
  var Source = Java.loadClass('net.minecraft.world.damagesource.DamageSource'),
    Pos = Java.loadClass('net.minecraft.core.BlockPos')
  var Box = Java.loadClass('net.minecraft.world.phys.AABB')
  var BOSS = Tag.create(Reg.ENTITY_TYPE, 'mk:bosses')
  var keys = {}
  ;['ranged', 'cleave', 'blade', 'counter', 'echo', 'domain'].forEach(id => {
    keys[id] = Key.create(Reg.DAMAGE_TYPE, 'mk:' + id)
  })
  var costs = { dismantle: 6, cleave: 14, blue: 35, red: 45, purple: 80, blink: 12 }
  var capacity = m => (team.roleOf(m) === 'star' ? 240 : phase(m) ? 240 : 120)
  function phase(m) {
    return m.persistentData.getBoolean('mkPhase2')
  }
  function time(m) {
    return Number(m.level.getTime())
  }
  function active(m) {
    return m && m.isAlive() && !m.isOrderedToSit()
  }
  function boss(e) {
    return e.tags.contains('mk_boss') || e.getEntityType().is(BOSS) || e.maxHealth >= 200
  }
  function hostile(m, e, includeDefeated) {
    if (
      !(e instanceof Living) ||
      (!includeDefeated && !e.isAlive()) ||
      e.isPlayer() ||
      e === m ||
      e.tags.contains('mk_shikigami') ||
      String(e.type) === 'touhou_little_maid:maid' ||
      (e instanceof Tame && e.isTame())
    )
      return false
    if (m.isOnSameTeam(e)) return false
    var owner = m instanceof Tame ? m.getOwner() : team.lookup(m.level, m.persistentData.getString('mkOwner'))
    if (owner && owner.isOnSameTeam(e)) return false
    return (
      e instanceof Enemy ||
      e.getEntityType().is(BOSS) ||
      e.tags.contains('mk_boss') ||
      e.tags.contains('mk_lair') ||
      e.tags.contains('mk_raid') ||
      (e instanceof Mob && e.getTarget() != null && (e.getTarget().is(m) || (owner && e.getTarget().is(owner))))
    )
  }
  function area(m, x, y, z, r) {
    var found = []
    m.level.getEntitiesWithin(new Box(x - r, y - r, z - r, x + r, y + r, z + r)).forEach(e => {
      if (hostile(m, e) && e.getDistanceSq(x, y, z) <= r * r) found.push(e)
    })
    return found
  }
  function nearest(m, r, see) {
    var target = null,
      best = r * r + 1
    area(m, m.x, m.y, m.z, r).forEach(e => {
      var d = m.distanceToEntitySqr(e)
      if (d < best && (!see || m.hasLineOfSight(e))) {
        target = e
        best = d
      }
    })
    return target
  }
  function aim(p, m) {
    var view = p.getLookAngle(),
      start = p.getEyePosition()
    var picked = null,
      first = 65
    area(m, m.x, m.y, m.z, 48).forEach(e => {
      var end = start.add(view.scale(64)),
        hit = e.boundingBox.inflate(0.65).clip(start, end)
      if (hit.isPresent()) {
        var dist = start.distanceTo(hit.get())
        if (dist < first && p.hasLineOfSight(e)) {
          picked = e
          first = dist
        }
      }
    })
    return picked || nearest(m, 36, true)
  }
  function point(e) {
    return [e.x, e.y + Math.min(e.bbHeight * 0.5, 3), e.z]
  }
  function direction(a, b) {
    var x = b[0] - a[0],
      y = b[1] - a[1],
      z = b[2] - a[2],
      n = Math.sqrt(x * x + y * y + z * z) || 1
    return [x / n, y / n, z / n]
  }
  function scaled(m, v) {
    return v * (team.roleOf(m) === 'saint' && phase(m) ? 2 : 1)
  }
  function hit(m, e, amount, id) {
    if (!hostile(m, e)) return false
    var holder = m.level.registryAccess().registryOrThrow(Reg.DAMAGE_TYPE).getHolderOrThrow(keys[id])
    return e.attack(new Source(holder, m, m), amount)
  }
  function fx(m, id, x, y, z, n, spread) {
    var part = Java.loadClass('net.minecraft.core.particles.ParticleTypes')
    m.level.sendParticles(part[id], x, y, z, n, spread, spread, spread, 0.015)
  }
  function spend(m, cost) {
    var d = m.persistentData,
      energy = d.getInt('mkEnergy')
    if (energy < cost) return false
    d.putInt('mkEnergy', energy - cost)
    return true
  }
  function locked(m) {
    return m.persistentData.getLong('mkBurnEnd') > time(m)
  }
  function burnedOut(m) {
    return locked(m) && m.persistentData.getLong('mkDomainEnd') <= time(m)
  }
  function freeze(e, ticks) {
    var d = e.persistentData,
      now = time(e)
    if (d.getLong('mkStillEnd') <= now) {
      d.putDouble('mkStillX', e.x)
      d.putDouble('mkStillY', e.y)
      d.putDouble('mkStillZ', e.z)
    }
    d.putLong('mkStillEnd', Math.max(d.getLong('mkStillEnd'), now + ticks))
    e.setMotion(0, 0, 0)
    if (e instanceof Mob) e.getNavigation().stop()
  }
  function stasis(event) {
    var e = event.entity,
      d = e.persistentData
    if (e.level.isClientSide() || !d.contains('mkStillEnd') || !e.isAlive()) return
    if (time(e) >= d.getLong('mkStillEnd')) {
      d.remove('mkStillEnd')
      return
    }
    var x = d.getDouble('mkStillX'),
      y = d.getDouble('mkStillY'),
      z = d.getDouble('mkStillZ')
    if (e.getDistanceSq(x, y, z) > 0.0001) e.teleportTo(x, y, z)
    e.setMotion(0, 0, 0)
    if (e.invulnerableTime > 0) e.invulnerableTime--
    if (e.hurtTime > 0) e.hurtTime--
    event.setCanceled(true)
  }
  function dismantle(m, target, end) {
    var a = [m.x, m.eyeY, m.z],
      b = target ? point(target) : end,
      u = direction(a, b)
    var dist = Math.min(36, Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]))
    var grief = m.level.gameRules.getBoolean(
      Java.loadClass('net.minecraft.world.level.GameRules').RULE_MOBGRIEFING
    )
    var seen = {}
    for (var step = 0; step <= dist; step += 0.65) {
      var x = a[0] + u[0] * step,
        y = a[1] + u[1] * step,
        z = a[2] + u[2] * step
      if (Math.floor(step) % 3 === 0) fx(m, 'SWEEP_ATTACK', x, y, z, 1, 0)
      var pos = Pos.containing(x, y, z),
        code = String(pos.asLong())
      if (!grief || seen[code]) continue
      seen[code] = true
      var block = m.level.getBlockState(pos)
      if (
        !block.isAir() &&
        block.getFluidState().isEmpty() &&
        !block.hasBlockEntity() &&
        block.getDestroySpeed(m.level, pos) >= 0 &&
        block.canEntityDestroy(m.level, pos, m)
      )
        m.level.destroyBlock(pos, false, m)
    }
    if (target) hit(m, target, scaled(m, 52), 'ranged')
  }
  function startOrb(m, kind, target) {
    var d = m.persistentData,
      t = point(target),
      a = [m.x, m.eyeY, m.z],
      u = direction(a, t)
    if (kind === 'red') {
      fx(m, 'FLAME', t[0], t[1], t[2], 32, 1.5)
      area(m, t[0], t[1], t[2], 9).forEach(e => {
        var v = e.is(target) ? u : direction(t, point(e))
        e.addMotion(v[0] * 2.2, 0.7 + Math.max(0, v[1]), v[2] * 2.2)
        hit(m, e, 120, 'ranged')
      })
      return
    }
    var job = NBT.compoundTag(),
      base = kind === 'blue' ? t : a
    ;['X', 'Y', 'Z'].forEach((k, i) => {
      job.putDouble(k, base[i])
      job.putDouble('v' + k, u[i])
    })
    job.putInt('age', 0)
    d.put('mkOrb_' + kind, job)
  }
  function updateOrbs(m) {
    var d = m.persistentData
    ;['blue', 'purple'].forEach(kind => {
      var name = 'mkOrb_' + kind
      if (!d.contains(name)) return
      var job = d.getCompound(name),
        age = job.getInt('age')
      var x = job.getDouble('X'),
        y = job.getDouble('Y'),
        z = job.getDouble('Z')
      if (kind === 'blue') {
        if (age % 4 === 0) {
          fx(m, 'SOUL_FIRE_FLAME', x, y, z, 18, 0.6)
          area(m, x, y, z, 9).forEach(e => {
            var v = direction(point(e), [x, y, z])
            e.setMotion(v[0] * 0.8, v[1] * 0.8, v[2] * 0.8)
            hit(m, e, 16, 'ranged')
          })
        }
      } else {
        var vx = job.getDouble('vX'),
          vy = job.getDouble('vY'),
          vz = job.getDouble('vZ')
        for (var i = 0; i < 3; i++) {
          x += vx
          y += vy
          z += vz
          fx(m, 'DRAGON_BREATH', x, y, z, 4, 0.4)
          m.level
            .getEntitiesWithin(new Box(x - 1.3, y - 1.3, z - 1.3, x + 1.3, y + 1.3, z + 1.3))
            .forEach(e => {
              if (!hostile(m, e) || job.contains(String(e.uuid))) return
              job.putBoolean(String(e.uuid), true)
              hit(m, e, 260, 'ranged')
              if (e.isAlive()) freeze(e, 1200)
            })
        }
        job.putDouble('X', x)
        job.putDouble('Y', y)
        job.putDouble('Z', z)
      }
      job.putInt('age', age + 1)
      if (age + 1 >= (kind === 'blue' ? 24 : 16)) d.remove(name)
    })
  }
  function domainPulse(m) {
    var d = m.persistentData,
      saint = team.roleOf(m) === 'saint',
      radius = saint ? 18 : 24
    var x = d.getDouble('mkDomainX'),
      y = d.getDouble('mkDomainY'),
      z = d.getDouble('mkDomainZ')
    var stamp = d.getLong('mkDomainStart'),
      elapsed = time(m) - stamp
    if (elapsed % 10 === 0) {
      for (var i = 0; i < 20; i++) {
        var angle = (Math.PI * i) / 10
        fx(
          m,
          saint ? 'CRIT' : 'END_ROD',
          x + radius * Math.cos(angle),
          y + 1,
          z + radius * Math.sin(angle),
          1,
          0
        )
      }
    }
    area(m, x, y, z, radius).forEach(e => {
      if (!boss(e)) {
        e.kill()
        return
      }
      if (saint) {
        if (elapsed % 20 === 0) hit(m, e, scaled(m, 88), 'cleave')
      } else {
        var key = 'mkVoid_' + m.uuid
        if (e.persistentData.getLong(key) === stamp && e.persistentData.contains(key)) return
        e.persistentData.putLong(key, stamp)
        freeze(e, 3600)
        hit(m, e, Math.min(480, 0.65 * e.maxHealth), 'domain')
      }
    })
  }
  function domain(m) {
    var role = team.roleOf(m),
      d = m.persistentData,
      now = time(m)
    if (!active(m) || (role !== 'saint' && role !== 'star') || locked(m)) return false
    var saint = role === 'saint',
      duration = saint ? 100 : 40
    if (!spend(m, saint ? 55 : 180)) return false
    d.putLong('mkDomainStart', now)
    d.putLong('mkDomainEnd', now + duration)
    d.putLong('mkBurnEnd', now + duration + (saint ? (phase(m) ? 120 : 240) : 1000))
    d.putDouble('mkDomainX', m.x)
    d.putDouble('mkDomainY', m.y)
    d.putDouble('mkDomainZ', m.z)
    ;['mkPending', 'mkCleave', 'mkOrb_blue', 'mkOrb_purple'].forEach(k => d.remove(k))
    var p = m.getOwner()
    if (p) {
      p.tell(saint ? '§c圣女「领域展开，伏魔御厨子。」' : '§b斯塔·柏「领域展开，无量空处。」')
      global.mkQuestMark(p, 'domain')
    }
    domainPulse(m)
    return true
  }
  function unbind(m) {
    if (!m || team.roleOf(m) !== 'star' || !locked(m) || m.persistentData.getLong('mkDomainEnd') > time(m))
      return false
    var d = m.persistentData,
      day = Math.floor(Number(m.server.overworld().getDayTime()) / 24000)
    if (!d.contains('mkResetDay') || day > d.getLong('mkResetDay')) {
      d.putLong('mkResetDay', day)
      d.putInt('mkResets', 0)
    }
    if (d.getInt('mkResets') >= 3) return false
    d.putInt('mkResets', d.getInt('mkResets') + 1)
    d.putLong('mkBurnEnd', time(m))
    return true
  }
  function cast(m, action, target, end) {
    if (!active(m) || locked(m)) return false
    var role = team.roleOf(m),
      d = m.persistentData,
      now = time(m)
    if (
      (role === 'saint' && action !== 'dismantle' && action !== 'cleave') ||
      (role === 'star' && !['blue', 'red', 'purple', 'blink'].includes(action)) ||
      (role !== 'star' && role !== 'saint') ||
      (!target && !(action === 'dismantle' && end))
    )
      return false
    if (
      target &&
      (!hostile(m, target) ||
        m.distanceToEntity(target) > (action === 'cleave' ? 3.2 : action === 'dismantle' ? 36 : 40))
    )
      return false
    if (d.contains('mkPending')) {
      if (now > d.getLong('mkRelease')) return false
      var pre = String(d.getString('mkPending'))
      if ((pre === 'blue' && action === 'red') || (pre === 'red' && action === 'blue') || action === 'purple') {
        if (!spend(m, costs.purple)) return false
        d.remove('mkPending')
        startOrb(m, 'purple', target)
        d.putLong('mkNext', now + 24)
        return true
      }
      return false
    }
    if (now < d.getLong('mkNext') || d.getInt('mkEnergy') < costs[action]) return false
    if (action === 'blue' || action === 'red') {
      d.putString('mkPending', action)
      d.putString('mkOrbTarget', String(target.uuid))
      d.putLong('mkRelease', now + 4)
      return true
    }
    if (action === 'blink') {
      var spot = team.safeSpot(m, target, 4)
      if (!spot) return false
      m.teleportTo(spot[0], spot[1], spot[2])
      fx(m, 'PORTAL', m.x, m.y + 1, m.z, 30, 0.5)
    }
    spend(m, costs[action])
    if (action === 'dismantle') dismantle(m, target, end)
    if (action === 'cleave') {
      d.putString('mkCleave', String(target.uuid))
      d.putInt('mkCuts', 5)
      d.putLong('mkCutAt', now)
    }
    if (action === 'purple') startOrb(m, action, target)
    d.putLong('mkNext', now + (role === 'saint' ? (phase(m) ? 10 : 20) : 24))
    return true
  }
  function advance(m) {
    var d = m.persistentData,
      now = time(m)
    if (
      d.getLong('mkDomainEnd') > now &&
      d.getLong('mkDomainStart') !== now &&
      (now - d.getLong('mkDomainStart')) % 5 === 0
    )
      domainPulse(m)
    if (locked(m)) return
    if (d.contains('mkPending') && now >= d.getLong('mkRelease')) {
      var action = String(d.getString('mkPending')),
        target = team.lookup(m.level, d.getString('mkOrbTarget'))
      d.remove('mkPending')
      if (target && hostile(m, target) && spend(m, costs[action])) {
        startOrb(m, action, target)
        d.putLong('mkNext', now + 24)
      }
    }
    if (d.contains('mkCleave') && now >= d.getLong('mkCutAt')) {
      var e = team.lookup(m.level, d.getString('mkCleave')),
        cuts = d.getInt('mkCuts')
      if (e && hostile(m, e) && cuts > 0) {
        fx(m, 'DAMAGE_INDICATOR', e.x, e.y + 1, e.z, 4, 0.2)
        hit(m, e, scaled(m, 28), 'cleave')
        d.putInt('mkCuts', cuts - 1)
        d.putLong('mkCutAt', now + (phase(m) ? 2 : 4))
      } else d.remove('mkCleave')
    }
    updateOrbs(m)
  }
  global.mkJutsu = {
    active: active,
    boss: boss,
    hostile: hostile,
    area: area,
    nearest: nearest,
    aim: aim,
    hit: hit,
    fx: fx,
    time: time,
    phase: phase,
    capacity: capacity,
    locked: locked,
    burnedOut: burnedOut,
    domain: domain,
    unbind: unbind,
    cast: cast,
    advance: advance,
    stasis: stasis,
    damageTags: Types,
    projectile: Projectile,
    mob: Mob
  }
})()
