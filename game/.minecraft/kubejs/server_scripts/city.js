// ===== /mkcity —— 瞬间放置一整座「废弃殖民地」成品城（MineColonies 自带的世界生成结构） =====
// 原理：MineColonies 自带 15 张整城蓝图（worldgen structure），本来是自然生成的「废弃殖民地」。
//       这里用 /place structure 直接把它们贴到你脚下 —— 街道、民居、市政厅、田地、城墙一次性成型，
//       完全不需要建筑工慢慢盖。贴完找到城里的市政厅（Town Hall）右键 → 重新激活 → 城市归你。
// 用法：
//   /mkcity                默认 殖民风格（colonial_colony）
//   /mkcity list           列出所有可放的城市风格
//   /mkcity colonial       殖民风格      /mkcity medieval_oak    中世纪橡木
//   /mkcity medieval_spruce 中世纪云杉   /mkcity medieval_birch  中世纪桦木
//   /mkcity medieval_dark_oak 中世纪深橡 /mkcity asian          亚洲风格
//   /mkcity shire          夏尔风格      /mkcity incan           印加风格
//   /mkcity caledonia      喀里多尼亚    /mkcity desertoasis     沙漠绿洲
//   /mkcity lostmesa       失落台地      /mkcity warpednetherlands 诡异森林
//   （营地：/mkcity amazon /mkcity barbarian /mkcity desert /mkcity ship）
// 注意：
//   - 需要开启作弊（/place 是原版管理命令）。
//   - 建议先在平地上执行：/mkplat big 铺好平台再 /mkcity。
//   - 放出来的是「废弃」状态（部分方块会破损/缺），重新激活后让建筑工修补即可；
//     也可以直接在上面盖新的。
//   - 一座城占 100~200 格范围，别和已有殖民地/村庄重叠（至少隔开 8 区块）。

var MK_CITY_STYLES = {
  colonial: 'colonial_colony',
  medieval_oak: 'medieval_oak_colony',
  medieval_spruce: 'medieval_spruce_colony',
  medieval_birch: 'medieval_birch_colony',
  medieval_dark_oak: 'medieval_dark_oak_colony',
  asian: 'asian_colony',
  shire: 'shire_colony',
  incan: 'incan_colony',
  caledonia: 'caledonia_colony',
  desertoasis: 'desertoasis_colony',
  lostmesa: 'lostmesacity_colony',
  warpednetherlands: 'warpednetherlands_colony',
  amazon: 'amazon_camp',
  barbarian: 'barbarian_camp',
  desert: 'desert_camp',
  ship: 'ship'
}

function mkCityPlace(server, player, styleKey) {
  var id = MK_CITY_STYLES[styleKey]
  if (!id) {
    player.tell('§c[城池] 未知风格：' + styleKey + '（用 /mkcity list 看全部）')
    return 0
  }
  var dim = String(player.level.dimension)
  var fullId = 'minecolonies:' + id
  player.tell('§7[城池] 正在放置 §e' + styleKey + '§7 …（大范围结构，客户端会卡 1~2 秒）')

  try {
    server.runCommandSilent('execute in ' + dim + ' at ' + player.username + ' run place structure ' + fullId + ' ~ ~ ~')
  } catch (e) {
    console.info('[MKCITY] place 失败: ' + e)
    player.tell('§c[城池] 放置失败：' + e)
    return 0
  }

  player.tell('§a[城池] 已放置 ' + styleKey + ' 风格。下一步：')
  player.tell('§7  1) 找城里最高的那栋建筑 = 市政厅（Town Hall），右键它 → 选「重新激活」')
  player.tell('§7  2) 城市就归你了；破损的建筑让建筑工修建，或直接用')
  player.tell('§7提示：想找自然生成的同类城，用 §e/locate structure ' + fullId)
  return 1
}

ServerEvents.commandRegistry(function (event) {
  var C = event.commands

  function pOf(ctx) { return ctx.source.player }

  var root = C.literal('mkcity')
    .then(C.literal('list').executes(function (ctx) {
      var p = pOf(ctx)
      if (!p) return 0
      p.tell('§e[城池] 可选风格（/mkcity <名字>）：')
      var names = []
      for (var k in MK_CITY_STYLES) names.push(k)
      p.tell('§7' + names.join('、'))
      p.tell('§7例：§e/mkcity medieval_oak §7（中世纪橡木城）')
      return 1
    }))

  for (var key in MK_CITY_STYLES) {
    ;(function (k) {
      root = root.then(C.literal(k).executes(function (ctx) {
        var p = pOf(ctx)
        if (!p) return 0
        return mkCityPlace(ctx.source.server, p, k)
      }))
    })(key)
  }

  root = root.executes(function (ctx) {
    var p = pOf(ctx)
    if (!p) return 0
    return mkCityPlace(ctx.source.server, p, 'colonial')
  })

  event.register(root)
})
