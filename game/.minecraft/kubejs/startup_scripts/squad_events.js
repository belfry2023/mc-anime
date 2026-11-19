// Native combat hooks are registered once. Resolve the current server handlers after /reload.
;(function () {
  var events = {
    LivingTickEvent: 'tick',
    LivingAttackEvent: 'attack',
    LivingHurtEvent: 'hurt',
    LivingDamageEvent: 'damage',
    LivingDeathEvent: 'death',
    LivingChangeTargetEvent: 'target'
  }
  var reported = {}
  Object.keys(events).forEach(name => {
    var type = name === 'LivingTickEvent' ? 'LivingEvent$LivingTickEvent' : name
    ForgeEvents.onEvent('net.minecraftforge.event.entity.living.' + type, e => {
      if (e.entity.level.isClientSide()) return
      var h = global.mkCombatHooks
      if (!h) return
      try {
        h[events[name]](e)
      } catch (error) {
        var key = name + ' ' + error
        if (!reported[key]) {
          reported[key] = true
          console.error('[女仆小队] ' + key + ' ' + error.stack)
        }
      }
    })
  })
})()

// TLM's film and soul items construct a new entity and call readAdditionalSaveData.
// Carry the squad identity through that path, including persistent ability timers.
;(function () {
  var eventType = 'com.github.tartaricacid.touhoulittlemaid.api.event.MaidAndItemTransformEvent$'
  ForgeEvents.onEvent(eventType + 'ToItem', e => {
    var m = e.maid,
      d = m.persistentData
    if (m.level.isClientSide() || (!d.contains('mkRole') && !d.contains('mkJennyOwner'))) return
    var saved = NBT.compoundTag()
    d.getAllKeys().forEach(k => {
      if (String(k).startsWith('mk')) saved.put(k, d.get(k).copy())
    })
    e.data.put('mkSquadState', saved)
    e.data.putUUID('mkSquadUUID', m.uuid)
  })
  ForgeEvents.onEvent(eventType + 'ToMaid', e => {
    var m = e.maid,
      data = e.data
    if (m.level.isClientSide() || !data.hasUUID('mkSquadUUID') || !data.contains('mkSquadState')) return
    m.setUUID(data.getUUID('mkSquadUUID'))
    var state = data.getCompound('mkSquadState')
    m.persistentData.merge(state)
    var role = String(state.getString('mkRole'))
    if (role) {
      m.addTag('mk_' + role)
      m.addTag('mk_role_' + role)
    }
  })
})()
