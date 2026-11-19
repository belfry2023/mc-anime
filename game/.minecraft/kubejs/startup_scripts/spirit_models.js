// Use the installed Cataclysm renderer on the client. The server keeps the owned spirit's AI and hitbox.
;(function () {
  if (!Platform.isClientEnvironment() || !Platform.isLoaded('cataclysm')) return
  var MC = Java.loadClass('net.minecraft.client.Minecraft')
  var Registry = Java.loadClass('net.minecraftforge.registries.ForgeRegistries')
  var Translated = Java.loadClass('net.minecraft.network.chat.contents.TranslatableContents')
  var cache = new (Java.loadClass('java.util.WeakHashMap'))()
  var forms = {
    'mk.spirit.wheel': ['cataclysm:scylla', 0.62],
    'mk.spirit.fusion': ['cataclysm:ender_guardian', 0.66]
  }
  var failed = {}
  ForgeEvents.onEvent('net.minecraftforge.client.event.ClientPlayerNetworkEvent$LoggingOut', () =>
    cache.clear()
  )
  ForgeEvents.onEvent('net.minecraftforge.client.event.RenderLivingEvent$Pre', (ev) => {
    var spirit = ev.getEntity()
    if (String(spirit.type) !== 'minecraft:iron_golem' || !spirit.hasCustomName()) return
    var name = spirit.getCustomName().getContents()
    if (!(name instanceof Translated)) return
    var form = forms[String(name.getKey())]
    if (!form || failed[form[0]]) return
    var stack = ev.getPoseStack()
    stack.pushPose()
    try {
      var proxy = cache.get(spirit)
      if (!proxy) {
        var type = Registry.ENTITY_TYPES.getValue(form[0])
        if (!type) return
        proxy = type.create(spirit.level)
        if (!proxy) return
        cache.put(spirit, proxy)
      }
      proxy.setPos(spirit.x, spirit.y, spirit.z)
      proxy.age = spirit.age
      proxy.setRotation(spirit.yaw, spirit.pitch)
      proxy.yRotO = spirit.yRotO
      proxy.xRotO = spirit.xRotO
      proxy.yHeadRot = spirit.yHeadRot
      proxy.yHeadRotO = spirit.yHeadRotO
      proxy.yBodyRot = spirit.yBodyRot
      proxy.yBodyRotO = spirit.yBodyRotO
      proxy.hurtTime = spirit.hurtTime
      proxy.deathTime = spirit.deathTime
      proxy.walkAnimation.setSpeed(spirit.walkAnimation.speed())
      if (proxy.persistentData.getInt('mkFrame') !== spirit.age) {
        proxy.walkAnimation.update(spirit.walkAnimation.speed(), 1)
        proxy.persistentData.putInt('mkFrame', spirit.age)
      }
      proxy.setCustomName(spirit.getCustomName())
      proxy.setCustomNameVisible(true)
      stack.scale(form[1], form[1], form[1])
      MC.getInstance()
        .getEntityRenderDispatcher()
        .getRenderer(proxy)
        .render(proxy, spirit.yaw, ev.getPartialTick(), stack, ev.getMultiBufferSource(), ev.getPackedLight())
      ev.setCanceled(true)
    } catch (error) {
      failed[form[0]] = true
      console.error('[式神外观] ' + form[0] + ' ' + error)
    } finally {
      stack.popPose()
    }
  })
})()
