// priority: 65
;(function () {
  var Particles = Java.loadClass('net.minecraft.core.particles.ParticleTypes')
  var styles = {
    dismantle: ['解', 'SWEEP_ATTACK', 'entity.player.attack.sweep', 1.5],
    cleave: ['捌', 'CRIT', 'item.trident.hit', 0.75],
    blue: ['术式顺转 · 苍', 'SOUL_FIRE_FLAME', 'block.respawn_anchor.charge', 1.6],
    red: ['术式反转 · 赫', 'FLAME', 'entity.generic.explode', 1.45],
    purple: ['虚式 · 茈', 'DRAGON_BREATH', 'entity.warden.sonic_boom', 1.3],
    blink: ['瞬移', 'REVERSE_PORTAL', 'entity.enderman.teleport', 1.3],
    infinity: ['无下限 · 物理攻击无效', 'END_ROD', 'block.amethyst_block.chime', 1.6],
    unbind: ['术式熔断已解除', 'ENCHANT', 'block.beacon.activate', 1.4],
    wheel: ['式神显现 · 魔虚罗', 'ENCHANT', 'entity.elder_guardian.curse', 1.4],
    fusion: ['式神显现 · 颚吐', 'SOUL', 'block.respawn_anchor.charge', 0.8],
    adapt: ['魔虚罗 · 适应再生', 'HAPPY_VILLAGER', 'block.amethyst_block.chime', 0.75],
    support: ['颚吐 · 嘲讽与回流', 'HEART', 'block.beacon.power_select', 1.5],
    phase: ['圣女 · 二阶段解放', 'TOTEM_OF_UNDYING', 'item.totem.use', 0.85],
    sight: ['纸板狐 · 发现敌情', 'ELECTRIC_SPARK', 'block.note_block.hat', 1.3],
    echo: ['纸板狐 · 复制射击', 'ELECTRIC_SPARK', 'entity.firework_rocket.shoot', 1.7],
    ward: ['天与咒缚 · 远术无效', 'ENCHANTED_HIT', 'item.shield.block', 1.7],
    dodge: ['闪避 · 太刀会心', 'CLOUD', 'entity.player.attack.sweep', 1.8],
    counter: ['格挡反击 · 太刀会心', 'WAX_OFF', 'item.shield.block', 1.25],
    critical: ['太刀 · 暴击', 'CRIT', 'entity.player.attack.crit', 1.0],
    shrine: ['领域展开 · 伏魔御厨子', 'SOUL_FIRE_FLAME', 'entity.wither.spawn', 0.65],
    void: ['领域展开 · 无量空处', 'REVERSE_PORTAL', 'block.end_portal.spawn', 0.75]
  }
  function center(e) {
    return [e.x, e.y + Math.min(2.5, e.bbHeight * 0.56), e.z]
  }
  function dot(level, type, pos, count, spread) {
    level.sendParticles(Particles[type], pos[0], pos[1], pos[2], count, spread, spread, spread, 0.02)
  }
  function ring(level, type, pos, radius, count, phase) {
    for (var n = 0; n < count; n++) {
      var a = (2 * Math.PI * n) / count + (phase || 0)
      dot(level, type, [pos[0] + Math.cos(a) * radius, pos[1], pos[2] + Math.sin(a) * radius], 1, 0)
    }
  }
  function line(level, type, a, b) {
    var steps = Math.max(2, Math.min(22, Math.ceil(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) / 1.2)))
    for (var i = 0; i <= steps; i++)
      dot(
        level,
        type,
        [
          a[0] + ((b[0] - a[0]) * i) / steps,
          a[1] + ((b[1] - a[1]) * i) / steps,
          a[2] + ((b[2] - a[2]) * i) / steps
        ],
        1,
        0
      )
  }
  function notice(p, message) {
    if (p && p.isPlayer()) p.setStatusMessage(Text.of(message))
  }
  function effect(e, id, at, owner, minTicks) {
    var style = styles[id],
      d = e.persistentData,
      now = Number(e.level.getTime()),
      key = 'mkFx_' + id
    if (minTicks && d.contains(key) && now < d.getLong(key)) return
    if (minTicks) d.putLong(key, now + minTicks)
    var origin = center(e),
      pos = at || origin
    dot(e.level, style[1], pos, 14, 0.38)
    if (at) line(e.level, style[1], origin, at)
    if (id === 'red' || id === 'purple' || id === 'infinity' || id === 'ward' || id === 'phase')
      ring(e.level, style[1], pos, id === 'red' ? 4.5 : 1.6, 14, 0)
    e.server.runCommandSilent(
      'execute in ' +
        e.level.dimension +
        ' positioned ' +
        pos.join(' ') +
        ' run playsound minecraft:' +
        style[2] +
        ' player @a[distance=..48] ~ ~ ~ 0.75 ' +
        style[3]
    )
    notice(owner, '§b' + style[0])
  }
  global.mkFX = {
    center: center,
    dot: dot,
    ring: ring,
    line: line,
    play: effect,
    notice: notice,
    label: (id) => (styles[id] ? styles[id][0] : id)
  }
})()
