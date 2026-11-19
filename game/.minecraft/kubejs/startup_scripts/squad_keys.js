;(function () {
  if (!Platform.isClientEnvironment()) return
  var Key = Java.loadClass('net.minecraft.client.KeyMapping')
  var MC = Java.loadClass('net.minecraft.client.Minecraft')
  var actions = [
    'status',
    'saint',
    'star',
    'lock',
    'primary',
    'secondary',
    'purple',
    'blink',
    'cast',
    'unbind',
    'quest'
  ]
  var bindings = []
  ForgeModEvents.onEvent('net.minecraftforge.client.event.RegisterKeyMappingsEvent', e => {
    actions.forEach((k, i) => {
      var b = new Key('key.mc_anime.' + k, 320 + i, 'key.categories.mc_anime')
      e.register(b)
      bindings.push(b)
    })
  })
  ForgeEvents.onEvent('net.minecraftforge.event.TickEvent$ClientTickEvent', e => {
    if (String(e.phase) !== 'END') return
    var mc = MC.getInstance()
    bindings.forEach((b, i) => {
      while (b.consumeClick()) {
        if (mc.player && mc.screen == null)
          mc.player.connection.sendCommand(i === 10 ? 'mkstatus' : 'mkdomain ' + actions[i])
      }
    })
  })
})()
