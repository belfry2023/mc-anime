// ============================================================
// /mkboss —— 灾变（Cataclysm）BOSS 结构雷达
// ------------------------------------------------------------
// 用法：
//   /mkboss        六大 BOSS 结构各扫一次
//   /mkboss all    连小结构一起扫
//
// 实现：调用 ServerLevel#findNearestMapStructure 直接拿坐标/距离，
//       自己排版回聊天栏（不依赖 locate 指令的聊天输出）。
// ============================================================

var TagKey = Java.loadClass('net.minecraft.tags.TagKey')
var Registries = Java.loadClass('net.minecraft.core.registries.Registries')
var ResourceLocation = Java.loadClass('net.minecraft.resources.ResourceLocation')
var BlockPos = Java.loadClass('net.minecraft.core.BlockPos')

var MK_BOSS_MAJOR = [
  ['利维坦 · 沉没之城', 'cataclysm:sunken_city'],
  ['焰魔 · 燃烧竞技场', 'cataclysm:burning_arena'],
  ['咒翼灵骸 · 冰封监狱', 'cataclysm:frosted_prison'],
  ['远古遗魂 · 诅咒金字塔', 'cataclysm:cursed_pyramid'],
  ['末影守卫 · 废墟堡垒', 'cataclysm:ruined_citadel'],
  ['斯库拉 · 卫城', 'cataclysm:acropolis']
]

var MK_BOSS_MINOR = [
  ['冰封尖塔', 'cataclysm:abandoned_spire'],
  ['废弃神殿', 'cataclysm:abandoned_temple'],
  ['废弃村庄', 'cataclysm:abandoned_village'],
  ['灵魂锻炉', 'cataclysm:soul_black_smith'],
  ['远古工厂', 'cataclysm:ancient_factory'],
  ['紫水晶巢（紫水晶巨蟹）', 'cataclysm:amethyst_nest'],
  ['沙漠遗址（骸龙）', 'cataclysm:desert_site']
]

function mkBossCompass(dx, dz) {
  if (dx === 0 && dz === 0) return '脚下'
  var deg = Math.atan2(dz, dx) * 180 / Math.PI // 0=东，90=南(z+)
  if (deg < 0) deg = deg + 360
  var names = ['东', '东南', '南', '西南', '西', '西北', '北', '东北']
  return names[Math.round(deg / 45) % 8]
}

// 返回 [x, y, z, 水平距离, 方位]，找不到返回 null
// 半径单位 = 区块（100 区块 = 1600 格，原版 locate 用的就是这个）
function mkBossFind(player, structureId, radius) {
  try {
    var key = TagKey.create(Registries.STRUCTURE, new ResourceLocation(structureId))
    var origin = new BlockPos(Math.floor(player.x), Math.floor(player.y), Math.floor(player.z))
    var found = player.level.findNearestMapStructure(key, origin, radius, false)
    if (!found) return null
    var bp = found.getFirst()
    var dx = bp.getX() - origin.getX()
    var dz = bp.getZ() - origin.getZ()
    return [
      bp.getX(),
      bp.getY(),
      bp.getZ(),
      Math.floor(Math.sqrt(dx * dx + dz * dz)),
      mkBossCompass(dx, dz)
    ]
  } catch (err) {
    console.info('[MKBOSS] 查找 ' + structureId + ' 失败: ' + err)
    return null
  }
}

function mkBossRun(player, list, radius) {
  player.tell(
    '§b[MK] 灾变 BOSS 雷达 §7· 维度 ' + String(player.level.dimension) + ' §7· 半径 ' + radius * 16 + ' 格'
  )
  var miss = 0
  list.forEach(function (entry) {
    var r = mkBossFind(player, entry[1], radius)
    if (!r) {
      miss = miss + 1
      player.tell('§c✘ §e' + entry[0] + ' §8' + entry[1] + ' §7— 半径内没有')
      return
    }
    player.tell(
      '§a✔ §e' + entry[0] + ' §7→ §b' + r[0] + ', ' + r[1] + ', ' + r[2] +
        ' §7· §f' + r[3] + ' 格 §7· §f' + r[4]
    )
  })
  if (miss > 0) {
    player.tell('§8没找到的可能是不在当前维度/群系：末影守卫→末地，焰魔/灵魂锻炉→下界，沉没之城→深海，斯库拉→暖海，冰封系→雪原，诅咒金字塔→沙漠')
    player.tell('§8想搜更远就用 §e/mkboss far §8（半径 9600 格，会卡一下）')
  }
  player.tell('§8/mkboss all 连小结构一起扫；坐标可直接 /tp x y z')
}

ServerEvents.commandRegistry(function (ev) {
  var L = ev.commands.literal

  function bossCmd(radius) {
    return function (c) {
      mkBossRun(c.source.playerOrException, MK_BOSS_MAJOR, radius)
      return 1
    }
  }
  function bossAllCmd(radius) {
    return function (c) {
      mkBossRun(c.source.playerOrException, MK_BOSS_MAJOR.concat(MK_BOSS_MINOR), radius)
      return 1
    }
  }

  ev.register(
    L('mkboss')
      .executes(bossCmd(100))
      .then(L('far').executes(bossCmd(600)))
      .then(L('all').executes(bossAllCmd(100)).then(L('far').executes(bossAllCmd(600))))
  )
})
