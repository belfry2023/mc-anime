// home_court.js —— 庭院模块
// 负责：西侧泳池、东侧田地、北侧草地花园（树/花/石板小径/常亮灯）。
// 由 home.js 的 buildHome() 在二层室内之后调用：global.mkHomeCourt(env)。
// 注意：房屋占地 x=px-10..px+10 / z=pz-7..pz+7、南门廊与道路（x=px-3..px+3, z=pz+8..pz+16）
//       以及 8 根红石路灯柱柱位一律不碰；路灯柱柱位整列留空。

global.mkHomeCourt = function (env) {
  var fill = env.fill
  var set = env.set
  var px = env.px
  var py = env.py
  var pz = env.pz
  var i
  var j

  // 8 根红石路灯柱柱位（由 mkHomeRedstone 建造），这些坐标连正上/正下都留空
  var rsX = [px - 4, px + 4, px - 2, px + 2, px - 11, px + 11, px - 11, px + 11]
  var rsZ = [pz + 10, pz + 10, pz + 15, pz + 15, pz - 8, pz - 8, pz + 8, pz + 8]

  var reserved = function (x, z) {
    var k
    for (k = 0; k < rsX.length; k++) {
      if (x === rsX[k] && z === rsZ[k]) {
        return true
      }
    }
    return false
  }

  // 只在不与路灯柱冲突的位置放方块
  var put = function (x, y, z, block) {
    if (!reserved(x, z)) {
      set(x, y, z, block)
    }
  }

  // ---------- 一、西侧泳池：x=px-17..px-12，z=pz-5..pz+5（6×11）----------
  // 挖坑（保留 Y=py-2 作为池底垫层）
  fill(px - 17, py - 1, pz - 5, px - 12, py, pz + 5, 'minecraft:air')
  // 池底
  fill(px - 17, py - 2, pz - 5, px - 12, py - 2, pz + 5, 'minecraft:smooth_quartz')
  // 池壁四圈
  fill(px - 17, py - 1, pz - 5, px - 12, py, pz - 5, 'minecraft:smooth_quartz')
  fill(px - 17, py - 1, pz + 5, px - 12, py, pz + 5, 'minecraft:smooth_quartz')
  fill(px - 17, py - 1, pz - 5, px - 17, py, pz + 5, 'minecraft:smooth_quartz')
  fill(px - 12, py - 1, pz - 5, px - 12, py, pz + 5, 'minecraft:smooth_quartz')
  // 注水（内池）
  fill(px - 16, py - 1, pz - 4, px - 13, py, pz + 4, 'minecraft:water')
  // 池底四角海晶灯
  set(px - 16, py - 1, pz - 4, 'minecraft:sea_lantern')
  set(px - 13, py - 1, pz - 4, 'minecraft:sea_lantern')
  set(px - 16, py - 1, pz + 4, 'minecraft:sea_lantern')
  set(px - 13, py - 1, pz + 4, 'minecraft:sea_lantern')
  // 跳台（北侧两格石英台阶）
  set(px - 14, py + 1, pz - 6, 'minecraft:smooth_quartz_slab')
  set(px - 14, py + 1, pz - 7, 'minecraft:smooth_quartz_slab')

  // ---------- 二、东侧田地：x=px+12..px+17，z=pz-8..pz+8（6×17）----------
  // 中央水渠
  fill(px + 14, py, pz - 8, px + 14, py, pz + 8, 'minecraft:water')
  // 两侧耕地
  fill(px + 12, py, pz - 8, px + 13, py, pz + 8, 'minecraft:farmland[moisture=7]')
  fill(px + 15, py, pz - 8, px + 17, py, pz + 8, 'minecraft:farmland[moisture=7]')
  // 庄稼：五列，每列沿 z 满种
  var crops = [
    [px + 12, 'minecraft:wheat[age=7]'],
    [px + 13, 'minecraft:carrots[age=7]'],
    [px + 15, 'minecraft:potatoes[age=7]'],
    [px + 16, 'minecraft:beetroots[age=3]'],
    [px + 17, 'minecraft:wheat[age=7]']
  ]
  for (i = 0; i < crops.length; i++) {
    for (j = pz - 8; j <= pz + 8; j++) {
      set(crops[i][0], py + 1, j, crops[i][1])
    }
  }
  // 围栏：南北两排（z=pz-9 / pz+9），东西两排（x=px+11 / px+18）
  for (i = px + 11; i <= px + 18; i++) {
    put(i, py + 1, pz - 9, 'minecraft:oak_fence')
    put(i, py + 1, pz + 9, 'minecraft:oak_fence')
  }
  for (i = pz - 8; i <= pz + 8; i++) {
    put(px + 11, py + 1, i, 'minecraft:oak_fence')
    put(px + 18, py + 1, i, 'minecraft:oak_fence')
  }
  // 南侧留门（x=px+14）
  set(px + 14, py + 1, pz + 9, 'minecraft:oak_fence_gate[facing=south]')
  // 堆肥桶（挪到北围栏外侧一格，避开 px+11/pz-8 的路灯柱位）
  set(px + 13, py + 1, pz - 10, 'minecraft:composter')
  // 稻草人
  set(px + 12, py + 1, pz + 7, 'minecraft:hay_block[axis=y]')
  set(px + 12, py + 2, pz + 7, 'minecraft:carved_pumpkin[facing=south]')
  // 田地照明（常亮，嵌在东围栏线上）
  set(px + 18, py + 1, pz - 4, 'minecraft:sea_lantern')
  set(px + 18, py + 1, pz + 4, 'minecraft:sea_lantern')

  // ---------- 三、北侧草地花园（z=pz-16..pz-8，地面已是 grass_block）----------
  // 4 棵橡树：树干 3 高 + 两层树冠 + 顶芯
  var treeX = [px - 14, px - 6, px + 6, px + 14]
  var treeZ = [pz - 13, pz - 14, pz - 14, pz - 13]
  for (i = 0; i < treeX.length; i++) {
    var tx = treeX[i]
    var tz = treeZ[i]
    fill(tx, py + 1, tz, tx, py + 3, tz, 'minecraft:oak_log[axis=y]')
    fill(tx - 2, py + 4, tz - 2, tx + 2, py + 4, tz + 2, 'minecraft:oak_leaves[persistent=true,distance=7]')
    fill(tx - 1, py + 5, tz - 1, tx + 1, py + 5, tz + 1, 'minecraft:oak_leaves[persistent=true,distance=7]')
    set(tx, py + 6, tz, 'minecraft:oak_leaves[persistent=true,distance=7]')
  }
  // 花
  set(px - 10, py + 1, pz - 12, 'minecraft:dandelion')
  set(px - 8, py + 1, pz - 13, 'minecraft:poppy')
  set(px + 8, py + 1, pz - 13, 'minecraft:azure_bluet')
  set(px + 10, py + 1, pz - 12, 'minecraft:oxeye_daisy')
  // 石板小径：北侧花园 ↔ 房屋北侧
  fill(px - 1, py, pz - 8, px + 1, py, pz - 8, 'minecraft:smooth_quartz_slab')
  // 庭院常亮灯（花园东西两侧）
  set(px - 14, py + 1, pz - 8, 'minecraft:sea_lantern')
  set(px + 14, py + 1, pz - 8, 'minecraft:sea_lantern')
}
