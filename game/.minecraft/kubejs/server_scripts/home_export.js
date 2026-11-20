// ===== 房屋导出：把手工建的房子数字化，供 /mkhome 复刻 =====
// 用法（游戏内走到对应位置后执行）：
//   /savehome mark1   记录第一个对角（站到房子/庭院的一个外下角）
//   /savehome mark2   记录第二个对角（站到斜对角的另一处角落）
//   /savehome anchor  记录锚点（站到你想让 /mkhome 传送后的落脚点，如正门口）
//   /savehome go      导出数据（写入 kubejs/home_saved.json，并立即在内存生效）
//   /savehome reset   清除已记录的标记
// 导出成功后直接 /mkhome 即可复刻；重进世界后也会自动读取 home_saved.json。
// 注意：只导出「方块 + 方块实体（箱子/熔炉/告示牌/旗帜等的内容）」；
//       物品展示框、画、盔甲架等属于「实体」，本版不导出。

// 导出范围：向下 EXPORT_Y_BELOW 格、向上 EXPORT_Y_HEIGHT 格（相对最低标记点）。
// 若房子有很深的地下室或庭院有很高的树，调大这两个值即可。
var EXPORT_Y_BELOW = 3
var EXPORT_Y_HEIGHT = 32

function shMarkPos(p, key) {
  var t = NBT.compoundTag()
  t.putInt('x', Math.floor(p.x))
  t.putInt('y', Math.floor(p.y))
  t.putInt('z', Math.floor(p.z))
  p.persistentData.put(key, t)
  p.tell('§a已记录 ' + key + ' = (' + t.getInt('x') + ', ' + t.getInt('y') + ', ' + t.getInt('z') + ')')
  return 1
}

function shReset(p) {
  p.persistentData.remove('shMark1')
  p.persistentData.remove('shMark2')
  p.persistentData.remove('shAnchor')
  p.tell('§e已清除 savehome 标记')
  return 1
}

// 把方块的属性 Java Map 转成纯 JS 对象（可 JSON 序列化）
function shPropsObj(b) {
  var out = {}
  var m = b.getProperties()
  var it = m.keySet().iterator()
  while (it.hasNext()) {
    var k = String(it.next())
    out[k] = String(m.get(k))
  }
  return out
}

function shDoExport(server, p) {
  try {
    return shExportRun(server, p)
  } catch (err) {
    p.tell('§c导出异常: ' + String(err))
    var st = ''
    try { st = (err && err.stack) ? String(err.stack) : '' } catch (e2) { st = '' }
    if (st) {
      var parts = st.split('\n')
      var lim = Math.min(parts.length, 5)
      var i
      for (i = 0; i < lim; i++) p.tell('§7' + parts[i])
    }
    return 0
  }
}

function shExportRun(server, p) {
  var pd = p.persistentData
  if (!pd.contains('shMark1') || !pd.contains('shMark2') || !pd.contains('shAnchor')) {
    p.tell('§c请先依次执行 /savehome mark1、mark2、anchor，再 go')
    return 0
  }
  var m1 = pd.getCompound('shMark1')
  var m2 = pd.getCompound('shMark2')
  var an = pd.getCompound('shAnchor')

  var x0 = Math.min(m1.getInt('x'), m2.getInt('x')) - 1
  var x1 = Math.max(m1.getInt('x'), m2.getInt('x')) + 1
  var z0 = Math.min(m1.getInt('z'), m2.getInt('z')) - 1
  var z1 = Math.max(m1.getInt('z'), m2.getInt('z')) + 1
  var y0 = Math.min(m1.getInt('y'), m2.getInt('y')) - EXPORT_Y_BELOW
  var y1 = y0 + EXPORT_Y_HEIGHT - 1

  var ax = an.getInt('x'), ay = an.getInt('y'), az = an.getInt('z')
  if (ax < x0 || ax > x1 || ay < y0 || ay > y1 || az < z0 || az > z1) {
    p.tell('§c锚点不在导出范围内，请站到房子范围内重新 /savehome anchor')
    return 0
  }

  var sx = x1 - x0 + 1, sy = y1 - y0 + 1, sz = z1 - z0 + 1
  var volume = sx * sy * sz
  if (volume > 400000) {
    p.tell('§c导出范围过大（' + volume + ' 方块），请缩小标记范围或减小 EXPORT_Y_HEIGHT')
    return 0
  }
  p.tell('§7导出范围 ' + sx + '×' + sy + '×' + sz + '（合计 ' + volume + ' 方块），开始遍历...')

  var level = p.level
  var blocks = []
  var entities = []
  var count = 0
  var skipped = 0
  var x, y, z
  for (x = x0; x <= x1; x++) {
    for (y = y0; y <= y1; y++) {
      for (z = z0; z <= z1; z++) {
        try {
          var b = level.getBlock(x, y, z)
          var id = String(b.id)
          if (id !== 'minecraft:air' && id !== 'minecraft:cave_air' && id !== 'minecraft:void_air') {
            blocks.push([x - x0, y - y0, z - z0, id, shPropsObj(b)])
            count++
            var be = b.getEntity()
            if (be) {
              // 优先取 BlockContainerJS.entityData；退化到 entity.entityData（support ticket 实测可用）
              var tag = b.entityData || be.entityData
              if (tag) entities.push([x - x0, y - y0, z - z0, tag.toString()])
            }
          }
        } catch (err) {
          skipped++
        }
      }
    }
  }

  p.tell('§7遍历完成：' + blocks.length + ' 个非空气方块、' + entities.length + ' 个方块实体，正在写入文件...')
  var data = {
    anchor: [ax - x0, ay - y0, az - z0],
    size: [sx, sy, sz],
    blocks: blocks,
    entities: entities
  }

  // KubeJS 6 出于安全禁止脚本加载 java.io / java.nio.file 类（class filter）；
  // 官方提供 JsonIO 全局绑定用于把 JSON 写进游戏目录（传字符串路径，内部由 typewrapper 转 Path）。
  var outPath = 'kubejs/home_saved.json'
  var wrote = false
  var errMsg = ''
  try {
    JsonIO.write(outPath, data)
    wrote = true
  } catch (e1) {
    try {
      // 兜底：先显式转成 Gson JsonObject 再写（MapJS.json 是 KubeJS 自带工具，不受文件类过滤影响）
      JsonIO.write(outPath, Java.loadClass('dev.latvian.mods.kubejs.util.MapJS').json(data))
      wrote = true
    } catch (e2) {
      errMsg = String(e2)
    }
  }
  global.mkHomeSaved = data
  if (wrote) {
    p.tell('§b导出完成：' + count + ' 个方块、' + entities.length + ' 个方块实体，尺寸 ' + sx + '×' + sy + '×' + sz + (skipped > 0 ? '，跳过 ' + skipped + ' 个异常方块' : ''))
    p.tell('§b已写入 ' + outPath + '。现在直接 /mkhome 即可；重启后也会自动读取该文件')
  } else {
    // 兜底：JsonIO 不可用时，把 JSON 分块打到游戏日志，由外部脚本落盘成 home_saved_data.js
    p.tell('§eJsonIO 写入失败（' + errMsg + '），改为输出到日志，请把日志发给助手处理')
    var s = JSON.stringify(data)
    var CH = 12000
    var total = Math.ceil(s.length / CH)
    for (var ci = 0; ci < total; ci++) {
      console.info('[SAVEHOME]' + ci + '/' + total + ':' + s.substring(ci * CH, (ci + 1) * CH))
    }
    p.tell('§e已分 ' + total + ' 段写入日志（搜索 SAVEHOME）')
  }
  return 1
}

ServerEvents.commandRegistry(e => {
  var L = e.commands.literal
  e.register(
    L('savehome')
      .then(L('mark1').executes(c => shMarkPos(c.source.playerOrException, 'shMark1')))
      .then(L('mark2').executes(c => shMarkPos(c.source.playerOrException, 'shMark2')))
      .then(L('anchor').executes(c => shMarkPos(c.source.playerOrException, 'shAnchor')))
      .then(L('reset').executes(c => shReset(c.source.playerOrException)))
      .then(L('go').executes(c => shDoExport(c.source.server, c.source.playerOrException)))
  )
})
