;(function () {
  var s = global.mkSquad,
    j = global.mkJutsu
  function selected(p) {
    return String(p.persistentData.getString('mkSelected')) || 'saint'
  }
  function act(p, cmd) {
    var key = selected(p),
      m = s.get(p, cmd === 'unbind' ? 'star' : key)
    if (cmd === 'primary') cmd = key === 'saint' ? 'dismantle' : 'blue'
    if (cmd === 'secondary') cmd = key === 'saint' ? 'cleave' : 'red'
    if (cmd === 'status') {
      ;['saint', 'star'].forEach(k => {
        var a = s.get(p, k)
        if (!a) {
          p.tell(s.roles[k].name + ' · 未在本维度加载')
          return
        }
        var d = a.persistentData,
          now = j.time(a),
          day = Math.floor(Number(p.server.overworld().getDayTime()) / 24000)
        var left = day > d.getLong('mkResetDay') ? 3 : 3 - d.getInt('mkResets')
        p.tell(
          s.roles[k].name +
            ' · ' +
            (k === key ? '已选中 · ' : '') +
            (d.getBoolean('mkManual') ? '手动' : '自动') +
            ' · 咒力 ' +
            d.getInt('mkEnergy') +
            '/' +
            j.capacity(a) +
            ' · 领域 ' +
            Math.ceil(Math.max(0, d.getLong('mkDomainEnd') - now) / 20) +
            ' 秒 · 距可施术 ' +
            Math.ceil(Math.max(0, d.getLong('mkBurnEnd') - now) / 20) +
            ' 秒' +
            (k === 'star' ? ' · 今日解熔 ' + left + '/3' : j.phase(a) ? ' · 二阶段' : ' · 一阶段')
        )
      })
      return 1
    }
    if (!m || m.distanceToEntity(p) > 64) {
      p.tell('§e对应队员须在本维度 64 格内。')
      return 0
    }
    if (cmd === 'auto' || cmd === 'manual') {
      m.persistentData.putBoolean('mkManual', cmd === 'manual')
      p.tell(s.roles[key].name + ' · ' + (cmd === 'auto' ? '自主施术' : '听令施术'))
      return 1
    }
    var ok = false
    if (cmd === 'unbind') ok = j.unbind(m)
    else if (cmd === 'cast') ok = j.domain(m)
    else {
      var a = j.aim(p, m),
        look = p.getLookAngle()
      ok = j.cast(m, cmd, a, [p.x + look.x() * 32, p.eyeY + look.y() * 32, p.z + look.z() * 32])
    }
    if (ok) {
      p.tell('§b指令已执行 · ' + cmd)
      return 1
    }
    p.tell('§e未发动。请检查职业、目标距离、坐姿、咒力、熔断或今日次数。/mkdomain status')
    return 0
  }
  ServerEvents.commandRegistry(e => {
    var C = e.commands,
      root = C.literal('mkdomain').executes(c => act(c.source.playerOrException, 'status'))
    ;['saint', 'star', 'fox', 'magic'].forEach(k =>
      root.then(
        C.literal(k).executes(c => {
          var p = c.source.playerOrException
          p.persistentData.putString('mkSelected', k)
          p.tell('已选择 ' + s.roles[k].name)
          return 1
        })
      )
    )
    ;[
      'primary',
      'secondary',
      'cast',
      'unbind',
      'status',
      'auto',
      'manual',
      'dismantle',
      'cleave',
      'blue',
      'red',
      'purple',
      'blink'
    ].forEach(k => root.then(C.literal(k).executes(c => act(c.source.playerOrException, k))))
    root.then(
      C.literal('lock').executes(c => {
        var p = c.source.playerOrException,
          fox = s.get(p, 'fox')
        if (!fox || fox.distanceToEntity(p) > 64) return 0
        var t = j.aim(p, fox)
        if (!t) {
          p.tell('视野内没有敌人。')
          return 0
        }
        fox.persistentData.putString('mkLock', String(t.uuid))
        p.tell('纸板狐锁定 ' + t.name.getString())
        return 1
      })
    )
    e.register(root)
  })
})()
