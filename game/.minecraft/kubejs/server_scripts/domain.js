;(function () {
  var s = global.mkSquad,
    j = global.mkJutsu
  function selected(p) {
    return String(p.persistentData.getString('mkSelected')) || 'saint'
  }
  function act(p, cmd) {
    var key = selected(p),
      m = s.get(p, cmd === 'unbind' ? 'star' : key)
    if (cmd === 'return') {
      if (global.mkScenes.emergency(p)) return 1
      p.tell('你当前没有无量空处的入场记录。')
      return 0
    }
    if (cmd === 'primary') cmd = key === 'saint' ? 'dismantle' : 'blue'
    if (cmd === 'secondary') cmd = key === 'saint' ? 'cleave' : 'red'
    if (cmd === 'status') {
      ;['saint', 'star'].forEach((k) => {
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
      var blade = s.get(p, 'magic')
      if (blade) {
        var stats = blade.persistentData
        p.tell(
          '魔法女仆 · 已习得史诗技能 ' +
            stats.getInt('mkSkillCount') +
            ' 项 · 会心剩余 ' +
            (Math.max(0, stats.getLong('mkHaste') - j.time(blade)) / 20).toFixed(1) +
            ' 秒'
        )
      }
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
    if (ok) return 1
    var d = m.persistentData,
      now = j.time(m),
      reason
    if (cmd === 'unbind') reason = '仅在斯塔·柏的领域结束、术式熔断中且当日尚有次数时可解熔'
    else if (key !== 'saint' && key !== 'star') reason = '请先选择圣女或斯塔·柏'
    else if (!j.active(m)) reason = '女仆正在待命，请先让她站起来'
    else if (j.locked(m))
      reason = '领域持续或熔断中，距可施术 ' + Math.ceil((d.getLong('mkBurnEnd') - now) / 20) + ' 秒'
    else if (cmd === 'cast' && !m.server.getLevel(global.mkScenes.realm) && key === 'star')
      reason = '未加载虚空维度，请完整重启游戏或服务端'
    else if (cmd === 'cast' && String(m.level.dimension) === global.mkScenes.realm)
      reason = '无法在封闭领域中再次展开'
    else if (cmd !== 'cast' && (key === 'saint') !== (cmd === 'cleave' || cmd === 'dismantle'))
      reason = '所选女仆未持有该术式'
    else if (d.getInt('mkEnergy') < (cmd === 'cast' ? (key === 'saint' ? 55 : 180) : j.costs[cmd]))
      reason = '当前咒力不足'
    else if (now < d.getLong('mkNext')) reason = '上一次施术尚在收招'
    else if (cmd === 'cleave') reason = '捌需要女仆接触 3.2 格内的敌人'
    else if (d.contains('mkPending')) reason = '正在蓄势，可用相反术式融合成茈'
    else reason = cmd === 'cast' ? '领域场地暂不可用' : '需锁定范围内的可见敌人或有效落点'
    global.mkFX.notice(p, '§e' + reason)
    return 0
  }
  ServerEvents.commandRegistry((e) => {
    var C = e.commands,
      root = C.literal('mkdomain').executes((c) => act(c.source.playerOrException, 'status'))
    ;['saint', 'star', 'fox', 'magic'].forEach((k) =>
      root.then(
        C.literal(k).executes((c) => {
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
      'return',
      'auto',
      'manual',
      'dismantle',
      'cleave',
      'blue',
      'red',
      'purple',
      'blink'
    ].forEach((k) => root.then(C.literal(k).executes((c) => act(c.source.playerOrException, k))))
    root.then(
      C.literal('lock').executes((c) => {
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
