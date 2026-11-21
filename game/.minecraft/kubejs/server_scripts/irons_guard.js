// ============================================================
// 铁魔法（Iron's Spells）法师渲染崩溃保护 —— 可开关
// ------------------------------------------------------------
// 背景：crash-2026-11-21_21.22.59-client.txt
//   客户端渲染 irons_spellbooks:cryomancer（冰霜术士）时，GeckoLib 抛
//   GeckoLibException: irons_spellbooks:geo/abstract_casting_mob.geo.json:
//   Unable to find model，直接把客户端崩掉。
//   模型文件其实就在 mods/irons_spellbooks-1.20.1-3.16.3.jar 里，依赖版本也满足，
//   属于 GeckoLib 模型缓存 / 改模组件（ysm_geo_compat）冲突，脚本层修不了，
//   但可以在服务端把这类法师实体提前清掉，让客户端根本没机会渲染它们。
//
// 用法：/mkguard        查看状态
//       /mkguard on     开启
//       /mkguard off    关闭
//   开关存在世界存档里（server.persistentData），重启后保持；默认关闭。
// ============================================================

// 清理半径（格）。崩溃发生在实体进入视野时，这里给宽一点更保险。
var MK_IRONS_GUARD_RADIUS = 160

// 要清理的实体类型。这些都是共用 abstract_casting_mob 人形模型的法师。
var MK_IRONS_GUARD_TYPES = [
  'irons_spellbooks:cryomancer',
  'irons_spellbooks:pyromancer',
  'irons_spellbooks:priest',
  'irons_spellbooks:apothecarist',
  'irons_spellbooks:archevoker',
  'irons_spellbooks:cultist',
  'irons_spellbooks:necromancer'
  // 想连 BOSS 一起清，就把下面两行前面的注释去掉（注意：BOSS 也会一起消失）
  // , 'irons_spellbooks:citadel_keeper'
  // , 'irons_spellbooks:dead_king'
  // , 'irons_spellbooks:fire_boss'
]

// 每多少 tick 扫一次（20 tick = 1 秒）
var MK_IRONS_GUARD_PERIOD = 20
// 提示玩家的最小间隔（tick）
var MK_IRONS_GUARD_TELL_GAP = 200

var mkIronsGuardTick = 0
var mkIronsGuardLastTell = -MK_IRONS_GUARD_TELL_GAP

function mkIronsGuardOn(server) {
  try {
    return server.persistentData.getBoolean('mkIronsGuard')
  } catch (err) {
    return false
  }
}

function mkIronsGuardSet(server, on) {
  server.persistentData.putBoolean('mkIronsGuard', on)
}

// 把玩家附近的法师实体清掉，返回清理数量
function mkIronsGuardSweep(server) {
  var removed = 0
  for (var i = 0; i < MK_IRONS_GUARD_TYPES.length; i++) {
    var type = MK_IRONS_GUARD_TYPES[i]
    try {
      var res = server.runCommandSilent(
        'execute as @a at @s run kill @e[type=' + type + ',distance=..' + MK_IRONS_GUARD_RADIUS + ']'
      )
      if (typeof res === 'number' && res > 0) removed += res
    } catch (err) {
      // 单个类型失败不影响其它类型
    }
  }
  return removed
}

function mkIronsGuardTellAll(server, msg) {
  try {
    server.players.forEach(function (p) {
      p.tell(msg)
    })
  } catch (err) {}
}

ServerEvents.tick(function (ev) {
  var server = ev.server
  if (!server) return

  mkIronsGuardTick++
  if (mkIronsGuardTick % MK_IRONS_GUARD_PERIOD !== 0) return
  if (!mkIronsGuardOn(server)) return

  var removed = mkIronsGuardSweep(server)
  if (removed > 0) {
    console.info('[MKGUARD] 清理 ' + removed + ' 个 Iron\'s 法师实体（防客户端渲染崩溃）')
    if (mkIronsGuardTick - mkIronsGuardLastTell >= MK_IRONS_GUARD_TELL_GAP) {
      mkIronsGuardLastTell = mkIronsGuardTick
      mkIronsGuardTellAll(server, '§e[MK] 铁魔法保护：已清理 ' + removed + ' 个 Iron\'s 法师（防止渲染崩溃）')
    }
  }
})

ServerEvents.commandRegistry(function (ev) {
  var commands = ev.commands
  var L = commands.literal

  ev.register(
    L('mkguard')
      .executes(function (c) {
        var server = c.source.server
        var on = mkIronsGuardOn(server)
        var p = c.source.playerOrException
        p.tell(
          '§b[MK] 铁魔法保护：' +
            (on ? '§a已开启' : '§7已关闭') +
            '§r  半径 ' + MK_IRONS_GUARD_RADIUS + ' 格 / 清理 ' + MK_IRONS_GUARD_TYPES.length + ' 类法师'
        )
        p.tell('§7用法：/mkguard on  开启   /mkguard off  关闭')
        return 1
      })
      .then(
        L('on').executes(function (c) {
          var server = c.source.server
          mkIronsGuardSet(server, true)
          mkIronsGuardSweep(server)
          c.source.playerOrException.tell(
            '§a[MK] 铁魔法保护已开启：玩家 ' + MK_IRONS_GUARD_RADIUS + ' 格内的 Iron\'s 法师会被立即清理'
          )
          return 1
        })
      )
      .then(
        L('off').executes(function (c) {
          var server = c.source.server
          mkIronsGuardSet(server, false)
          c.source.playerOrException.tell('§7[MK] 铁魔法保护已关闭')
          return 1
        })
      )
  )
})
