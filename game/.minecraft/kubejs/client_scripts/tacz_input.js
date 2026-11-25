// priority: 10
// TACZ 键位改造（客户端脚本）
//
// 注意：KubeJS 2001.6.5 里 ForgeEvents 只在 startup_scripts 可见，
// 这里只能定义 global 函数，由 startup_scripts/snipe_events.js 转发事件：
//   global.mkTaczMouse(event)       ← InputEvent$MouseButton$Pre
//   global.mkTaczClientTick(event)  ← TickEvent$ClientTickEvent
//
// 1) 右键：点一下 = 开镜并保持；每再点一次 = 倍率 +1；
//          到最大倍率后再点 = 回到腰射，如此循环。
// 2) 趴下：Ctrl+V 点一下切换（TACZ 自带），趴着时按 Ctrl 不会把你顶起来；
//          蹲 / 跳 会解除趴下。
//
// 前置（必须一致，否则和 TACZ 自己的按键逻辑打架）：
//   config/tacz-client.toml :  HoldToAim = false、HoldToCrawl = false
//   options.txt            :  key_key.tacz.aim.desc = key.keyboard.unknown
//                            （开镜完全交给本脚本）

;(function () {
  if (!Platform.isClientEnvironment()) return

  var MC = Java.loadClass('net.minecraft.client.Minecraft')
  var IGun = Java.loadClass('com.tacz.guns.api.item.IGun')
  var GunOp = Java.loadClass('com.tacz.guns.api.client.gameplay.IClientPlayerGunOperator')
  var ZoomKey = Java.loadClass('com.tacz.guns.client.input.ZoomKey')

  // first   = 开镜时的第一档倍率（回到它就说明绕完一圈）
  // before  = 换档前的倍率
  // pending = 已请求换档，等待服务端同步
  // crawlAt = 开始趴下的 tick（给一点缓冲，避免按 Ctrl 的那一帧被自己顶起来）
  var st = { first: -1.0, before: -1.0, pending: false, wait: 0, crawlAt: -1000, crawling: false }

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
  global.mkTaczMouse = function (event) {
    try {
      if (event.button !== 1 || event.action !== 1) return
      var player = localPlayer()
      if (!player) return
      if (!IGun.mainHandHoldGun(player)) return

      var op = operator(player)
      if (!op) return

      event.setCanceled(true) // 拦掉原版右键：不挖方块、不使用物品

      if (!op.isAim()) {
        op.aim(true)                 // 腰射 → 开镜
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
    } catch (err) {
      if (typeof console !== 'undefined') console.info('[MKTACZ] mouse error: ' + err)
    }
  }

  // ── 2) 每 tick 收尾：倍率轮询 + 趴下 ────────────────────────────
  global.mkTaczClientTick = function (event) {
    try {
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
          if (st.first >= 0 && Math.abs(now - st.first) < 0.0001) {
            // 绕回第一档 = 已经到顶 → 回腰射
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

      // ── 趴下 ──
      if (!op) return
      var crawling = false
      try { crawling = !!op.isCrawl() } catch (err) { return }
      if (crawling && !st.crawling) st.crawlAt = player.tickCount
      st.crawling = crawling
      if (!crawling) return

      // 刚趴下的 8 tick 内不判解除
      if (player.tickCount - st.crawlAt > 8) {
        var o = mc().options
        var cancel = false
        // 注意：冲刺键默认就是 Left Ctrl，和 Ctrl+V 的 Ctrl 是同一个键，
        // 所以这里不能用冲刺键解除趴下，否则一按 Ctrl+V 立刻站起来。
        if (o.keyShift && o.keyShift.isDown) cancel = true
        if (o.keyJump && o.keyJump.isDown) cancel = true
        if (cancel) op.crawl(false)
      }
      // 趴着的时候按住 Ctrl 会触发冲刺并把人顶起来，这里压掉冲刺
      if (mc().options.keySprint && mc().options.keySprint.isDown) {
        try { player.setSprinting(false) } catch (err) {}
      }
    } catch (err) {
      if (typeof console !== 'undefined') console.info('[MKTACZ] tick error: ' + err)
    }
  }
})()
