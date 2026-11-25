// priority: 10
// TACZ 键位改造（客户端脚本）
//
// 1) 右键：点一下 = 开镜并保持；每再点一次 = 倍率 +1；
//          到最大倍率后再点 = 回到腰射。之后重复这个循环。
// 2) 趴下：Ctrl+V（TACZ 自带 crawl 键位）改成了「点一下切换」，见下面第 2 段；
//          蹲 / 跳 / 冲刺任意一个按下，自动站起来。
//
// 前置：config/tacz-client.toml 里 [key] HoldToAim = false、HoldToCrawl = false
// （否则按住/松开逻辑会和这里打架）。

;(function () {
  if (!Platform.isClientEnvironment()) return

  var MC = Java.loadClass('net.minecraft.client.Minecraft')
  var IGun = Java.loadClass('com.tacz.guns.api.item.IGun')
  var GunOp = Java.loadClass('com.tacz.guns.api.client.gameplay.IClientPlayerGunOperator')
  var ZoomKey = Java.loadClass('com.tacz.guns.client.input.ZoomKey')

  // 每次开镜记住第一档倍率，用于识别「换档绕回第一档 = 已经到顶」
  var st = { first: -1.0, before: -1.0, pending: false, wait: 0 }

  function localPlayer () {
    var mc = MC.getInstance()
    if (!mc || !mc.player || mc.screen != null) return null
    return mc.player
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
    return GunOp.fromLocalPlayer(player)
  }

  // ── 1) 右键：开镜 / 换倍率 / 回腰射 ─────────────────────────────
  ForgeEvents.onEvent('net.minecraftforge.client.event.InputEvent$MouseButton$Pre', event => {
    if (event.button !== 1 || event.action !== 1) return
    var player = localPlayer()
    if (!player) return
    if (!IGun.mainHandHoldGun(player)) return

    event.setCanceled(true) // 拦掉原版右键 → TACZ 的 AIM_KEY 不会被按下

    var op
    try { op = operator(player) } catch (err) { return }
    if (!op) return

    if (!op.isAim()) {
      // 腰射 → 开镜
      try { op.aim(true) } catch (err) { return }
      st.first = zoomOf(player)
      st.before = st.first
      st.pending = false
      return
    }

    // 已开镜 → 换下一档；如果当前已经在最后一档，就回腰射
    if (st.pending) return
    st.before = zoomOf(player)
    st.wait = 0
    ZoomKey.onZoomPress() // 和手动按倍率键同一条通道（内部会判断 isAim 并发包）
    st.pending = true
  })

  // 换档结果需要等服务端同步回客户端，用 tick 轮询判断是否绕回第一档
  ForgeEvents.onEvent('net.minecraftforge.event.TickEvent$ClientTickEvent', event => {
    if (String(event.phase) !== 'END') return
    var player = localPlayer()
    if (!player) return

    var op = null
    try { op = operator(player) } catch (err) { op = null }

    if (st.pending) {
      st.wait++
      var now = zoomOf(player)
      if (now < 0) {
        st.pending = false
      } else if (Math.abs(now - st.before) > 0.0001) {
        // 倍率确实变了：如果变成第一档，说明已经绕了一圈 → 退出开镜回到腰射
        if (st.first >= 0 && Math.abs(now - st.first) < 0.0001) {
          try { if (op) op.aim(false) } catch (err) {}
          st.first = -1.0
        }
        st.pending = false
      } else if (st.wait > 5) {
        // 服务端没回音（无瞄具 / 只有一档）：当作到顶处理
        try { if (op) op.aim(false) } catch (err) {}
        st.first = -1.0
        st.pending = false
      }
    }

    // 开镜状态被 TACZ 自己结束（换弹、切枪等）时清掉记录
    if (!st.pending && st.first >= 0) {
      var aiming = false
      try { aiming = !!op && op.isAim() } catch (err) {}
      if (!aiming) st.first = -1.0
    }

    // ── 2) 蹲 / 跳 / 冲刺 → 取消趴下 ───────────────────────────────
    try {
      if (op && op.isCrawl()) {
        var o = MC.getInstance().options
        var cancel = false
        if (o.keyShift && o.keyShift.isDown) cancel = true
        if (o.keyJump && o.keyJump.isDown) cancel = true
        if (o.keySprint && o.keySprint.isDown) cancel = true
        if (cancel) op.crawl(false)
      }
    } catch (err) {}
  })
})()
