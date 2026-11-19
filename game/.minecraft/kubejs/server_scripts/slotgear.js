;(function () {
  function assign(p) {
    var s = global.mkSquad,
      inv = p.inventory,
      gun = inv.getItem(0),
      ammo = inv.getItem(1),
      blade = inv.getItem(2)
    var guns = 0,
      blades = 0,
      rounds = 0
    ;['star', 'fox'].forEach(key => {
      var m = s.get(p, key)
      if (!m || m.distanceToEntity(p) > 64) return
      if (
        String(gun.id) === 'tacz:modern_kinetic_gun' &&
        gun.nbt &&
        String(gun.nbt.getString('GunId')) === 'lradd:qbz191_em'
      ) {
        m.setMainHandItem(gun.copy())
        guns++
      }
      if (
        String(ammo.id) === 'tacz:ammo' &&
        ammo.nbt &&
        String(ammo.nbt.getString('AmmoId')) === 'tacz:58x42'
      ) {
        var invHelper = Java.loadClass('net.minecraftforge.items.ItemHandlerHelper')
        var left = invHelper.insertItemStacked(m.getAvailableInv(false), ammo.copy(), false)
        rounds += ammo.count - left.count
      }
    })
    var magic = s.get(p, 'magic')
    if (
      magic &&
      magic.distanceToEntity(p) <= 64 &&
      !blade.isEmpty() &&
      (blade.hasTag('minecraft:swords') ||
        String(blade.id).indexOf('tachi') >= 0 ||
        String(blade.id).indexOf('katana') >= 0)
    ) {
      magic.setMainHandItem(blade.copy())
      blades++
    }
    p.tell('§b已复制原物品及配件：枪手 ' + guns + '/2，入库弹药 ' + rounds + ' 发，太刀 ' + blades + '/1。')
    return guns + blades + rounds > 0 ? 1 : 0
  }
  ItemEvents.rightClicked('minecraft:clock', e => {
    if (e.hand.toString() === 'MAIN_HAND') assign(e.player)
  })
  ServerEvents.commandRegistry(e =>
    e.register(e.commands.literal('mkslot').executes(c => assign(c.source.playerOrException)))
  )
})()
