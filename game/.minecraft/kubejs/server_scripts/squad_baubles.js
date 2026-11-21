// priority: 70
;(function () {
  var squad = global.mkSquad
  var Component = Java.loadClass('net.minecraft.network.chat.Component')
  var Slot = Java.loadClass('com.github.tartaricacid.touhoulittlemaid.inventory.container.backpack.BaubleContainer$BaubleSlot')
  var maid = 'touhou_little_maid:', spell = 'touhou_little_maid_spell:'
  var sets = {
    saint: [spell+'soul_book', spell+'flow_core', spell+'bleeding_heart', spell+'quick_chant_ring', maid+'fire_protect_bauble', maid+'explosion_protect_bauble'],
    star: [spell+'chaos_book', spell+'wound_rime_blade', spell+'rock_crystal', spell+'staranchor_pearl', maid+'magic_protect_bauble', maid+'fall_protect_bauble'],
    fox: [spell+'dream_cat_crystal', spell+'double_heart_chain', spell+'ender_pocket', spell+'fragrant_ingenuity', maid+'item_magnet_bauble', maid+'projectile_protect_bauble'],
    magic: [spell+'soul_book', spell+'sliver_cercis', spell+'bleeding_heart', spell+'spring_ring', maid+'explosion_protect_bauble', maid+'drown_protect_bauble']
  }
  function equip(m) {
    var role = squad.roleOf(m), set = sets[role]
    if (!set || !m.getOwnerUUID()) return
    var roster = m.server.persistentData.getCompound('mkRoster_' + m.getOwnerUUID())
    if (String(roster.getString(role)) !== String(m.uuid)) return
    var d = m.persistentData, inv = m.getMaidBauble()
    var favor = m.getFavorabilityManager().getLevel()
    var limit = Math.min(inv.getSlots(), favor <= 1 ? 10 : favor === 2 ? 20 : 30)
    if (!d.contains('mkIssuedBaubles')) d.put('mkIssuedBaubles', NBT.compoundTag())
    var issued = d.getCompound('mkIssuedBaubles')
    set.forEach((id) => {
      if (issued.getBoolean(id) || !Item.exists(id)) return
      var stack = Item.of(id), empty = -1
      for (var i = 0; i < inv.getSlots(); i++) {
        var worn = inv.getStackInSlot(i)
        if (String(worn.id) === id) { issued.putBoolean(id, true); return }
        if (empty < 0 && i < limit && worn.isEmpty() && inv.isItemValid(i, stack)) empty = i
      }
      if (empty < 0) return
      // Execute TLM's own slot callback, including onPutOn, Forge events and client sync.
      new Slot(m, empty, 0, 0).setByPlayer(stack)
      if (String(inv.getStackInSlot(empty).id) === id) issued.putBoolean(id, true)
    })
  }
  global.mkEquipBaubles = equip
  EntityEvents.spawned('touhou_little_maid:maid', (ev) => equip(ev.entity))
  ServerEvents.commandRegistry((ev) => ev.register(ev.commands.literal('mkbaubles').executes((ctx) => {
    var p = ctx.source.playerOrException
    Object.keys(sets).forEach((role) => {
      var m = squad.get(p, role), title = squad.roles[role].name
      if (!m) { p.tell(title + ' · 未在本维度加载'); return }
      equip(m)
      var inv = m.getMaidBauble(), worn = []
      for (var i = 0; i < inv.getSlots(); i++) {
        var stack = inv.getStackInSlot(i)
        if (!stack.isEmpty()) worn.push(stack.getHoverName())
      }
      var issued = m.persistentData.getCompound('mkIssuedBaubles')
      var pending = sets[role].filter((id) => !issued.getBoolean(id))
      var line = Component.literal(title + ' · 已佩戴 ' + worn.length + ' 件')
      worn.forEach((name, i) => line.append(i === 0 ? '：' : '、').append(name))
      p.tell(line)
      if (pending.length) p.tell('待配发（检查空槽与模组）：' + pending.join('、'))
    })
    return 1
  })))
})()
