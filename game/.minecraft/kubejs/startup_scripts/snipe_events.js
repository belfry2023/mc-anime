// priority: 100
// Forge 事件转接器（startup 脚本）
//
// KubeJS 2001.6.5 里 ForgeEvents 只在 startup_scripts 作用域可见，
// server_scripts / client_scripts 里直接写 ForgeEvents.onEvent 会报
// ReferenceError: "ForgeEvents" is not defined。
// 所以统一在这里注册，再转发给对应脚本里的 global 函数。

// ── 狙击补伤（server_scripts/snipe.js 实现） ─────────────────────────
ForgeEvents.onEvent('com.tacz.guns.api.event.common.EntityHurtByGunEvent$Pre', event => {
  if (typeof global.mkSnipePre === 'function') global.mkSnipePre(event)
})

ForgeEvents.onEvent('com.tacz.guns.api.event.common.EntityHurtByGunEvent$Post', event => {
  if (typeof global.mkSnipePost === 'function') global.mkSnipePost(event)
})

ForgeEvents.onEvent('net.minecraftforge.event.entity.living.LivingEvent$LivingTickEvent', event => {
  if (typeof global.mkSnipeLivingTick === 'function') global.mkSnipeLivingTick(event)
})

// ── 枪械键位（client_scripts/tacz_input.js 实现，仅客户端注册） ───────
if (Platform.isClientEnvironment()) {
  ForgeEvents.onEvent('net.minecraftforge.client.event.InputEvent$MouseButton$Pre', event => {
    if (typeof global.mkTaczMouse === 'function') global.mkTaczMouse(event)
  })

  ForgeEvents.onEvent('net.minecraftforge.event.TickEvent$ClientTickEvent', event => {
    if (typeof global.mkTaczClientTick === 'function') global.mkTaczClientTick(event)
  })
}
