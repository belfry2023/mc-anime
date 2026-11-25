// priority: 10
// TACZ 键位改造（客户端脚本）
//
// 1) 右键：点一下 = 开镜并保持；每再点一次 = 倍率 +1；
//          到最大倍率后再点 = 回到腰射。之后重复这个循环。
// 2) 趴下：Ctrl+V 点一下切换（TACZ 自带），趴着的时候按 Ctrl 不会把你顶起来；
//          蹲 / 跳 会解除趴下。
//
// 前置（必须一致，否则会和 TACZ 自己的按键逻辑打架）：
//   config/tacz-client.toml :  HoldToAim = false、HoldToCrawl = false
//   options.txt            :  key_key.tacz.aim.desc 改绑到 key.keyboard.unknown
//                            （让 TACZ 不再自己切换开镜，开镜完全交给本脚本）

;(function () {
  if (!Platform.isClientEnvironment()) return

  var MC = Java.loadClass('net.minecraft.client.Minecraft')
  var IGun = Java.loadClass('com.tacz.guns.api.item.IGun')
  var GunOp = Java.loadClass('com.tacz.guns.api.client.gameplay.IClientPlayerGunOperator')
  var ZoomKey = Java.loadClass('com.tacz.guns.client.input.ZoomKey')

  // first = 第一档倍率（判断「绕回第一档 = 已经到顶」）
  // before = 换档前的倍率
  // crawlAt = 开始趴下的 tick（给一点点缓冲，避免按 Ctrl 的那一帧被自己顶起来）
  var st = { first: -1.0, before: -1.0, pending: false, wait: 0, crawlAt: -100 }

  function mc () { return MC.getInstance() }

  function localPlayer () {
    var c = mc()
    if (!c || !c.player || c.screen != null) return null
    return c.player
  }

  function zoomOf (player) {
    try {
      if (!IGun.mainHandHoldGun(player)) return -1.0
      var stack = player.mainHandItem
      var gun = IGun.getIGunOrNull(stack)
      if (gun === null) return -1.0
      return gun.getAimingZoom(stack)
    } catch (err) {
      return -1.0
    }
  }

  function operator (player) {
    try { return GunOp.fromLocalPlayer(player) } catch (err) { return null }
  }

  // ── 1) 右键：开镜 / 换倍率 / 回腰射 ─────────────────────────────
  ForgeEvents.onEvent('net.minecraftforge.client.event.InputEvent$MouseButton$Pre', event => {
    if (event.button !== 1 || event.action !== 1) return
    var player = localPlayer()
    if (!player) return
    if (!IGun.mainHandHoldGun(player)) return

    event.setCanceled(true) // 拦掉原版右键（不挖方块/不使用物品）

    var op = operator(player)
    if (!op) return

    if (!op.isAim()) {
      // 腰射 → 开镜
      try { op.aim(true) } catch (err) { return }
      st.first = zoomOf(player)
      st.before = st.first
      st.pending = false
      return
    }

    // 已开镜 → 换下一档；绕回第一档 / 没有更高档 → 回腰射
    if (st.pending) return
    st.before = zoomOf(player)
    st.wait = 0
    try { ZoomKey.onZoomPress() } catch (err) { }
    st.pending = true
  })

  // 换档结果要等服务端同步回客户端，用 tick 轮询判断
  ForgeEvents.onEvent('net.minecraftforge.event.TickEvent$ClientTickEvent', event => {
    if (String(event.phase) !== 'END') return
    var player = localPlayer()
    if (!player) return
    var op = operator(player)

    // ── 倍率轮询 ──
    if (st.pending) {
      st.wait++
      var now = zoomOf(player)
      if (now < 0) {
        st.pending = false
      } else if (Math.abs(now - st.before) > 0.0001) {
        // 倍率变了：如果回到第一档，说明绕完一圈 → 回腰射
        if (st.first >= 0 && Math.abs(now - st.first) < 0.0001) {
          try { if (op) op.aim(false) } catch (err) {}
          st.first = -1.0
        }
        st.pending = false
      } else if (st.wait > 5) {
        // 服务端没回音（无瞄具 / 只有一档）：当作到顶，回腰射
        try { if (op) op.aim(false) } catch (err) {}
        st.first = -1.0
        st.pending = false
      }
    }

    if (!st.pending && st.first >= 0) {
      var aiming = false
      try { aiming = !!op && op.isAim() } catch (err) {}
      if (!aiming) st.first = -1.0
    }

    // ── 2) 趴下相关 ──────────────────────────────────────────────
    try {
      if (!op) return
      var crawling = !!op.isCrawl()
      if (crawling && !st.crawling) st.crawlAt = player.tickCount
      st.crawling = crawling
      if (!crawling) return

      // 刚趴下的 8 tick 内不判解除，避免按 Ctrl 的那一帧被判成「蹲/跳」
      if (player.tickCount - st.crawlAt > 8) {
        var o = mc().options
        var cancel = false
        // 注意：冲刺键默认就是 Left Ctrl，和 Ctrl+V 的 Ctrl 是同一个键，
        // 所以这里**不能**用冲刺键解除趴下，否则一按 Ctrl+V 立刻站起来。
        if (o.keyShift && o.keyShift.isDown) cancel = true
        if (o.keyJump && o.keyJump.isDown) cancel = true
        if (cancel) op.crawl(false)
      }
      // 趴着的时候按住 Ctrl 会触发冲刺并把人顶起来，这里压掉冲刺
      if (mc().options.keySprint && mc().options.keySprint.isDown) {
        try { player.setSprinting(false) } catch (err) {}
      }
    } catch (err) {}
  })
})()
