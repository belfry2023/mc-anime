// priority: 55
;(function () {
  var team = global.mkSquad,
    fx = global.mkFX
  var realm = 'mk:unlimited_void',
    floorY = 63
  function book(server) {
    var d = server.persistentData
    if (!d.contains('mkDomainScenes')) d.put('mkDomainScenes', NBT.compoundTag())
    return d.getCompound('mkDomainScenes')
  }
  function keys(d) {
    var out = []
    d.getAllKeys().forEach((k) => out.push(String(k)))
    return out
  }
  function record(e) {
    var d = NBT.compoundTag()
    d.putString('dim', String(e.level.dimension))
    d.putDouble('x', e.x)
    d.putDouble('y', e.y)
    d.putDouble('z', e.z)
    d.putFloat('yaw', e.yaw)
    d.putFloat('pitch', e.pitch)
    d.putBoolean('player', e.isPlayer())
    return d
  }
  // Brigadier centres integer X/Z coordinates. Explicit decimals preserve the exact return position.
  function precise(n) {
    return Number.isInteger(n) ? Number(n).toFixed(1) : String(n)
  }
  function command(level, text) {
    return level.server.runCommandSilent('execute in ' + level.dimension + ' run ' + text)
  }
  function display(level, sc, id, x, y, z, data) {
    var common =
      'Tags:["mk_domain_prop","mk_scene_' +
      sc.getLong('id') +
      '"],view_range:2.5f,brightness:{sky:15,block:15}'
    return command(
      level,
      'summon minecraft:' +
        id +
        ' ' +
        [precise(x), precise(y), precise(z)].join(' ') +
        ' {' +
        common +
        ',' +
        data +
        '}'
    )
  }
  function transform(w, h, l) {
    return (
      'transformation:{translation:[0f,0f,0f],scale:[' +
      w +
      'f,' +
      h +
      'f,' +
      l +
      'f],left_rotation:[0f,0f,0f,1f],right_rotation:[0f,0f,0f,1f]}'
    )
  }
  function shrine(level, sc) {
    var x = sc.getDouble('x'),
      y = sc.getDouble('y'),
      z = sc.getDouble('z')
    function piece(block, dx, dy, dz, w, h, l) {
      display(
        level,
        sc,
        'block_display',
        x + dx,
        y + dy,
        z + dz,
        'block_state:{Name:"minecraft:' + block + '"},' + transform(w, h, l)
      )
    }
    piece('polished_blackstone_bricks', -4, 0, -2, 8, 0.45, 5)
    piece('chiseled_polished_blackstone', -3.5, 0.45, -1.6, 7, 0.35, 4.2)
    piece('red_nether_bricks', -2.8, 0.8, -1.2, 5.6, 0.6, 3.4)
    ;[-2.4, 1.9].forEach((dx) => {
      ;[-0.9, 1.6].forEach((dz) => piece('crimson_stem', dx, 1.4, dz, 0.5, 3.3, 0.5))
    })
    piece('red_nether_bricks', -2.1, 1.4, 1.65, 4.2, 2.6, 0.3)
    piece('gilded_blackstone', -1.25, 1.4, -0.05, 2.5, 1.15, 1)
    piece('bone_block', -0.56, 2.55, 0.2, 1.12, 0.9, 0.65)
    ;[-0.42, 0.15].forEach((dx) => piece('blackstone', dx, 2.88, 0.14, 0.25, 0.23, 0.08))
    for (var i = 0; i < 3; i++)
      piece(
        'deepslate_tiles',
        -3.65 + i * 0.65,
        4.65 + i * 0.52,
        -1.6 + i * 0.42,
        7.3 - i * 1.3,
        0.55,
        4.55 - i * 0.84
      )
    ;[-3.25, 2.85].forEach((dx) => {
      piece('polished_blackstone', dx, 0, -3.55, 0.55, 0.65, 0.55)
      piece('stripped_crimson_stem', dx + 0.05, 0.65, -3.5, 0.44, 3.45, 0.44)
      piece('ochre_froglight', dx + 0.02, 3.65, -3.47, 0.5, 0.5, 0.5)
    })
    piece('crimson_planks', -3.65, 3.1, -3.53, 7.25, 0.25, 0.46)
    piece('polished_blackstone', -4, 4.12, -3.65, 8, 0.38, 0.72)
  }
  function frame(level, x, z, remove) {
    var n = 27
    var faces = [
      [-n, 0, -n, n, 0, n],
      [-n, 22, -n, n, 22, n],
      [-n, 1, -n, -n, 21, n],
      [n, 1, -n, n, 21, n],
      [-n + 1, 1, -n, n - 1, 21, -n],
      [-n + 1, 1, n, n - 1, 21, n]
    ]
    var ok = true
    faces.forEach((b) => {
      var count = command(
        level,
        'fill ' +
          [x + b[0], floorY + b[1], z + b[2], x + b[3], floorY + b[4], z + b[5]].join(' ') +
          (remove ? ' minecraft:air replace minecraft:barrier' : ' minecraft:barrier')
      )
      if (
        !remove &&
        !count &&
        String(level.getBlock(x + b[0], floorY + b[1], z + b[2]).id) !== 'minecraft:barrier'
      )
        ok = false
    })
    return ok
  }
  function ticket(level, x, z, add) {
    command(level, 'forceload ' + (add ? 'add ' : 'remove ') + [x - 28, z - 28, x + 28, z + 28].join(' '))
  }
  function platform(level, sc) {
    var x = sc.getInt('ax'),
      z = sc.getInt('az')
    ticket(level, x, z, true)
    // forceload schedules chunks. Synchronously obtain them before /fill in a newly created arena.
    for (var cx = (x - 28) >> 4; cx <= (x + 28) >> 4; cx++)
      for (var cz = (z - 28) >> 4; cz <= (z + 28) >> 4; cz++) level.getChunk(cx, cz)
    if (!frame(level, x, z, false)) return false
    var text = JSON.stringify({ text: '\ue000', font: 'mc_anime:void_sky', color: 'white' })
    // A vertically centred, camera-facing bitmap glyph. The arena entry faces the southern sky.
    display(
      level,
      sc,
      'text_display',
      x,
      77,
      z + 33,
      'billboard:"center",background:0,line_width:512,text_opacity:-1b,text:\'' +
        text +
        "'," +
        transform(24, 24, 24)
    )
    return true
  }
  function move(e, level, x, y, z, yaw, pitch) {
    level.getChunk(Math.floor(x) >> 4, Math.floor(z) >> 4)
    var id = String(e.uuid)
    var cmd =
      'execute in ' +
      e.level.dimension +
      ' as ' +
      id +
      ' in ' +
      level.dimension +
      ' run tp @s ' +
      [precise(x), precise(y), precise(z), yaw, pitch].join(' ')
    var still = e.persistentData.contains('mkStillEnd'),
      old
    if (still) {
      old = [e.x, e.y, e.z]
      setAnchor(e, x, y, z)
    }
    var accepted = e.server.runCommandSilent(cmd)
    // A destination chunk can take several ticks to publish the new entity in its UUID index.
    var arrived = team.lookup(level, id)
    var sent =
      !!arrived || (!!accepted && (e.isRemoved() || String(e.level.dimension) === String(level.dimension)))
    if (still && !sent) setAnchor(e, old[0], old[1], old[2])
    return sent
  }
  function setAnchor(e, x, y, z) {
    var d = e.persistentData
    d.putDouble('mkStillX', x)
    d.putDouble('mkStillY', y)
    d.putDouble('mkStillZ', z)
  }
  function bind(sc, e, voidLevel) {
    var members = sc.getCompound('members'),
      id = String(e.uuid),
      origin = record(e)
    members.put(id, origin)
    var x = sc.getInt('ax') + (e.x - sc.getDouble('x')),
      z = sc.getInt('az') + (e.z - sc.getDouble('z'))
    var sent = move(e, voidLevel, x, floorY + 1, z, 0, 0)
    if (!sent) members.remove(id)
    return sent
  }
  function returnOne(server, sc, id, online) {
    var members = sc.getCompound('members'),
      home = members.getCompound(id),
      v = server.getLevel(realm)
    var e = home.getBoolean('player')
      ? online || server.playerList.getPlayer(Java.loadClass('java.util.UUID').fromString(id))
      : v && team.lookup(v, id)
    if (!e) {
      if (!home.getBoolean('player')) members.remove(id)
      return false
    }
    if (String(e.level.dimension) !== realm || !e.isAlive()) {
      if (e.isAlive() || !home.getBoolean('player')) members.remove(id)
      return false
    }
    var dest = server.getLevel(String(home.getString('dim')))
    if (!dest) return false
    var sent = move(
      e,
      dest,
      home.getDouble('x'),
      home.getDouble('y'),
      home.getDouble('z'),
      home.getFloat('yaw'),
      home.getFloat('pitch')
    )
    if (!sent) return false
    members.remove(id)
    if (e.isPlayer()) fx.notice(e, '§b无量空处解除 · 已返回入场位置')
    return true
  }
  function close(server, sc) {
    var wasClosed = sc.getBoolean('closed'),
      isVoid = sc.getBoolean('void'),
      members = sc.getCompound('members')
    sc.putBoolean('closed', true)
    // While arena tickets are held, get every surviving visitor back. Offline players keep their own record.
    keys(members).forEach((id) => returnOne(server, sc, id))
    var level = server.getLevel(isVoid ? realm : String(sc.getString('dim')))
    if (level && !wasClosed) {
      if (!isVoid) level.getChunk(Math.floor(sc.getDouble('x')) >> 4, Math.floor(sc.getDouble('z')) >> 4)
      command(level, 'kill @e[tag=mk_scene_' + sc.getLong('id') + ']')
    }
    if (level && isVoid && !sc.getBoolean('cleaned')) {
      var live = keys(members).some(
        (id) => !members.getCompound(id).getBoolean('player') || !!team.lookup(level, id)
      )
      if (!live) {
        frame(level, sc.getInt('ax'), sc.getInt('az'), true)
        ticket(level, sc.getInt('ax'), sc.getInt('az'), false)
        sc.putBoolean('cleaned', true)
      }
    }
    if (!keys(members).length) book(server).remove(String(sc.getLong('id')))
  }
  function begin(m, saint, end) {
    var server = m.server,
      level = m.level,
      data = book(server),
      sd = server.persistentData
    var voidLevel = saint ? null : server.getLevel(realm)
    if (String(level.dimension) === realm || (!saint && !voidLevel)) return false
    var id = Number(sd.getLong('mkSceneSerial')) + 1,
      sc = record(m)
    sd.putLong('mkSceneSerial', id)
    sc.putLong('id', id)
    sc.putLong('start', level.getTime())
    sc.putLong('end', end)
    sc.putBoolean('void', !saint)
    sc.putString('caster', String(m.uuid))
    sc.put('members', NBT.compoundTag())
    data.put(String(id), sc)
    if (saint) {
      shrine(level, sc)
      return true
    }
    var occupied = {}
    keys(data).forEach((k) => {
      var r = data.getCompound(k)
      if (r.contains('slot') && !r.getBoolean('cleaned')) occupied[r.getInt('slot')] = true
    })
    var slot = 0
    while (occupied[slot]) slot++
    sc.putInt('slot', slot)
    sc.putInt('ax', (slot % 128) * 128 + 8)
    sc.putInt('az', Math.floor(slot / 128) * 128 + 8)
    if (!platform(voidLevel, sc)) {
      close(server, sc)
      return false
    }
    var owner = m.getOwner(),
      enemies = global.mkJutsu.area(m, m.x, m.y, m.z, 24)
    var d = m.persistentData
    d.putDouble('mkDomainX', sc.getInt('ax'))
    d.putDouble('mkDomainY', floorY + 1)
    d.putDouble('mkDomainZ', sc.getInt('az'))
    // Resolve the opening hit in the source world. Survivors carry their hit stamp and stasis timer across.
    if (!bind(sc, m, voidLevel)) {
      close(server, sc)
      return false
    }
    if (
      owner &&
      owner.level.equals(level) &&
      owner.getDistanceSq(sc.getDouble('x'), sc.getDouble('y'), sc.getDouble('z')) <= 24 * 24
    )
      bind(sc, owner, voidLevel)
    enemies.forEach((e) => {
      global.mkJutsu.voidHit(m, e, sc.getLong('end'))
      if (e.isAlive()) bind(sc, e, voidLevel)
    })
    return true
  }
  function buff(e, sc, ticks) {
    var kinds = sc.getBoolean('void')
      ? [
          ['minecraft:speed', 1],
          ['minecraft:resistance', 1]
        ]
      : [
          ['minecraft:strength', 1],
          ['minecraft:regeneration', 0]
        ]
    kinds.forEach((k) => e.potionEffects.add(k[0], ticks, k[1], true, false))
    // The short renewable effect expires promptly on departure. Give regen I its normal 50-tick pulse.
    if (
      !sc.getBoolean('void') &&
      (e.level.getTime() - sc.getLong('start')) % 50 === 0 &&
      e.health < e.maxHealth
    )
      e.heal(1)
  }
  function pulse(server, sc, now) {
    var isVoid = sc.getBoolean('void'),
      level = server.getLevel(isVoid ? realm : String(sc.getString('dim')))
    if (!level) return
    var caster = team.lookup(level, sc.getString('caster')),
      left = Number(sc.getLong('end')) - now
    if (!caster) {
      if (now - sc.getLong('start') >= 40) close(server, sc)
      return
    }
    if (!caster.isAlive()) {
      close(server, sc)
      return
    }
    var pos = isVoid
      ? [sc.getInt('ax'), floorY + 1, sc.getInt('az')]
      : [sc.getDouble('x'), sc.getDouble('y'), sc.getDouble('z')]
    var j = global.mkJutsu,
      owner = caster.getOwner(),
      radius = isVoid ? 24 : 18
    j.domainPulse(caster)
    if (left % 10 === 0 && isVoid)
      fx.ring(level, 'REVERSE_PORTAL', [pos[0], pos[1] + 3, pos[2]], 11, 16, now / 18)
    level
      .getEntitiesWithin(
        caster.boundingBox.move(pos[0] - caster.x, pos[1] - caster.y, pos[2] - caster.z).inflate(radius)
      )
      .forEach((e) => {
        if (!e.isLiving() || e.getDistanceSq(pos[0], pos[1], pos[2]) > radius * radius) return
        if (
          e.is(caster) ||
          (owner && (e.is(owner) || owner.isOnSameTeam(e))) ||
          (team.ownerOf(e) && team.ownerOf(e) === team.ownerOf(caster)) ||
          (e.tags.contains('mk_shikigami') && e.persistentData.getString('mkOwner') === team.ownerOf(caster))
        )
          buff(e, sc, Math.min(15, left))
      })
  }
  function emergency(p) {
    var data = book(p.server),
      id = String(p.uuid),
      found = false
    keys(data).forEach((k) => {
      var sc = data.getCompound(k)
      if (sc.getCompound('members').contains(id)) found = returnOne(p.server, sc, id, p) || found
    })
    return found
  }
  ServerEvents.tick((ev) => {
    var server = ev.server,
      now = Number(server.overworld().getTime())
    var data = book(server)
    keys(data).forEach((k) => {
      var sc = data.getCompound(k)
      if (now >= sc.getLong('end') || sc.getBoolean('closed')) {
        if (!sc.getBoolean('closed') || now % 20 === 0) close(server, sc)
      } else if ((now - sc.getLong('end')) % 5 === 0) pulse(server, sc, now)
    })
  })
  PlayerEvents.loggedIn((ev) => {
    var p = ev.player,
      data = book(ev.server)
    keys(data).forEach((k) => {
      var sc = data.getCompound(k)
      if (
        (sc.getBoolean('closed') || sc.getLong('end') <= ev.server.overworld().getTime()) &&
        sc.getCompound('members').contains(String(p.uuid))
      )
        returnOne(ev.server, sc, String(p.uuid), p)
    })
  })
  EntityEvents.spawned((ev) => {
    var e = ev.entity
    if (!e.tags.contains('mk_domain_prop')) return
    var data = book(e.server)
    e.tags.forEach((tag) => {
      var name = String(tag)
      if (!name.startsWith('mk_scene_')) return
      var scene = data.getCompound(name.substring(9))
      if (!scene.contains('end') || scene.getBoolean('closed') || scene.getLong('end') <= e.level.getTime())
        ev.cancel()
    })
  })
  global.mkScenes = { begin: begin, emergency: emergency, realm: realm }
})()
