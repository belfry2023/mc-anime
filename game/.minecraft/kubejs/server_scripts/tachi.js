// priority: 45
;(function () {
  var attributes = Java.loadClass('net.minecraft.world.entity.ai.attributes.Attributes')
  var tasks = Java.loadClass('com.github.tartaricacid.touhoulittlemaid.entity.task.TaskManager')
  var skills = Platform.isLoaded('ef_tlm') ? Java.loadClass('net.EFTLM.EF.Skill.MaidSkillManager') : null
  var fx = global.mkFX
  function train(m, now) {
    var d = m.persistentData,
      r = global.mkSquad.roles.magic
    if (d.getInt('mkBladeRevision') !== 2) {
      m.getAttribute(attributes.ATTACK_DAMAGE).setBaseValue(r.atk)
      m.getAttribute(attributes.MOVEMENT_SPEED).setBaseValue(r.speed)
      var speed = m.getAttribute(attributes.ATTACK_SPEED)
      if (speed) speed.setBaseValue(8)
      d.putInt('mkBladeRevision', 2)
    }
    if (!skills || now < d.getLong('mkNextLesson')) return
    var patch = global.mkFightPatch(m)
    if (!patch) {
      d.putLong('mkNextLesson', now + 20)
      return
    }
    var ids = skills.getSkillRegisterName()
    if (ids.isEmpty()) return
    var task = tasks.findTask('ef_tlm:fight_mode_task')
    if (task.isPresent() && !d.getBoolean('mkFightTrained')) {
      m.setTask(task.get())
      d.putBoolean('mkFightTrained', true)
    }
    ids.forEach((id) => {
      if (!patch.hasLearnedSkill(id)) patch.addLearnedSkill(id)
    })
    d.putInt('mkSkillCount', patch.getLearnedSkills().size())
    d.putLong('mkNextLesson', now + 200)
  }
  function window(m, kind) {
    var now = global.mkJutsu.time(m)
    m.persistentData.putLong('mkHaste', now + 60)
    fx.play(m, kind, null, m.getOwner(), 10)
  }
  function damage(ev, attacker, id) {
    var j = global.mkJutsu,
      e = ev.entity
    if (!j.hostile(attacker, e) || attacker.distanceToEntity(e) > 4 || ev.amount <= 0) return
    var d = attacker.persistentData,
      now = j.time(attacker)
    if (id !== 'mk:blade' && id !== 'mk:counter')
      d.putLong('mkSwing', now + (d.getLong('mkHaste') > now ? 2 : 4))
    // Native combos retain their weapon/skill multiplier. Apply the precision window once to the resulting hit.
    if (d.getLong('mkHaste') > now && Math.random() < 0.9) {
      ev.setAmount(ev.amount * 26)
      fx.play(attacker, 'critical', fx.center(e), null, 8)
    }
  }
  global.mkBlade = { train: train, window: window, damage: damage }
})()
