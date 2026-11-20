// Send the role when a player starts tracking the spirit. Forge persistentData is server-side.
;(function () {
  function sync(ev, leaving) {
    var e = ev.getTarget()
    if (String(e.type) !== 'minecraft:iron_golem' || !e.tags.contains('mk_shikigami')) return
    var kind = String(e.persistentData.getString('mkSpirit'))
    if (kind !== 'wheel' && kind !== 'fusion') return
    ev.getEntity().sendData('mk_spirit_form', {id: String(e.uuid), kind: leaving ? '' : kind})
  }
  ForgeEvents.onEvent('net.minecraftforge.event.entity.player.PlayerEvent$StartTracking', (ev) => sync(ev, false))
  ForgeEvents.onEvent('net.minecraftforge.event.entity.player.PlayerEvent$StopTracking', (ev) => sync(ev, true))
})()

// Render only a client-side proxy. Boss AI, boss bars and loot never enter the world.
;(function () {
  if (!Platform.isClientEnvironment() || !Platform.isLoaded('cataclysm')) return
  var MC = Java.loadClass('net.minecraft.client.Minecraft')
  var Registry = Java.loadClass('net.minecraftforge.registries.ForgeRegistries')
  var cache = new (Java.loadClass('java.util.WeakHashMap'))()
  var forms = {
    'mk.spirit.wheel': ['cataclysm:scylla', 0.62],
    'mk.spirit.fusion': ['cataclysm:ender_guardian', 0.66]
  }
  var roles = new Map(), failed = new (Java.loadClass('java.util.WeakHashMap'))()
  var rendered = new Map()
  global.mkSetSpiritForm = (id, kind) => {
    if (kind === 'wheel' || kind === 'fusion') roles.set(id, 'mk.spirit.' + kind)
    else {
      roles.delete(id)
      rendered.delete(id)
    }
  }
  global.mkRenderedSpirit = (id) => rendered.get(id)
  ForgeEvents.onEvent('net.minecraftforge.client.event.ClientPlayerNetworkEvent$LoggingOut', () => {
    cache.clear()
    roles.clear()
    rendered.clear()
    failed.clear()
  })
  ForgeEvents.onEvent('net.minecraftforge.client.event.RenderLivingEvent$Pre', (ev) => {
    var spirit = ev.getEntity()
    if (String(spirit.type) !== 'minecraft:iron_golem') return
    var id = String(spirit.uuid), form = forms[roles.get(id)]
    if (!form || (failed.containsKey(spirit) && spirit.age < Number(failed.get(spirit)))) return
    var stack = ev.getPoseStack()
    stack.pushPose()
    try {
      var proxy = cache.get(spirit)
      if (!proxy) {
        var type = Registry.ENTITY_TYPES.getValue(form[0])
        if (!type) throw new Error('缺少实体类型 ' + form[0])
        proxy = type.create(spirit.level)
        if (!proxy) throw new Error('无法创建外观 ' + form[0])
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
      rendered.set(id, form[0])
      failed.remove(spirit)
    } catch (error) {
      rendered.delete(id)
      if (!failed.containsKey(spirit)) console.error('[式神外观] ' + form[0] + ' ' + error)
      failed.put(spirit, Number(spirit.age) + 40)
      cache.remove(spirit)
    } finally {
      stack.popPose()
    }
  })
})()
