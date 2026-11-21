// These summoned pets are tracked by the saint. Bucketing one would sever that link.
ForgeEvents.onEvent('net.minecraftforge.event.entity.player.PlayerInteractEvent$EntityInteract', (ev) => {
  var e = ev.getTarget()
  if (e.level.isClientSide() || !e.tags.contains('mk_shikigami')) return
  var item = String(ev.getItemStack().id)
  if (item === 'minecraft:bucket' || item === 'minecraft:water_bucket') ev.setCanceled(true)
})
