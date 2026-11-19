// home_first.js —— 一层室内模块
// 负责：一层三个隔间（西=厨房 / 中=待客厅 / 东=楼梯间+仓管室）的隔墙、门洞与家具。
// 由 home.js 的 buildHome() 在外壳与楼梯之后调用：global.mkHomeFirst(env)。
// 注意：楼梯井(px+4..px+5, pz-3..pz+4)、梯子井(px+9, pz+4)、南门通道(px-1..px, pz+5..pz+6)
//       以及 x0/x1/z0/z1 外墙上的玻璃、门、立柱都不属于本模块，这里绝不触碰。

global.mkHomeFirst = function (env) {
  var fill = env.fill
  var set = env.set
  var px = env.px
  var py = env.py
  var pz = env.pz

  // ---------- 一、两道南北向隔墙（白混凝土，Y=py+1..py+3）----------
  // 厨房 ↔ 待客厅：x = px-4，门洞 1 宽 2 高，z = pz+2
  fill(px - 4, py + 1, pz - 6, px - 4, py + 3, pz + 6, 'minecraft:white_concrete')
  fill(px - 4, py + 1, pz + 2, px - 4, py + 2, pz + 2, 'minecraft:air')

  // 待客厅 ↔ 楼梯间：x = px+3，门洞 1 宽 2 高，z = pz+4
  fill(px + 3, py + 1, pz - 6, px + 3, py + 3, pz + 6, 'minecraft:white_concrete')
  fill(px + 3, py + 1, pz + 4, px + 3, py + 2, pz + 4, 'minecraft:air')

  // ---------- 二、厨房（西间 x=px-9..px-5）----------
  // 靠西墙一排操作台（北 → 南）
  set(px - 9, py + 1, pz - 5, 'minecraft:smoker[facing=east]')
  set(px - 9, py + 1, pz - 3, 'minecraft:furnace[facing=east]')
  set(px - 9, py + 1, pz - 1, 'minecraft:crafting_table')
  set(px - 9, py + 1, pz + 1, 'minecraft:barrel[facing=up]')
  // 中岛水槽 + 吊灯
  set(px - 7, py + 1, pz + 3, 'minecraft:cauldron')
  set(px - 7, py + 3, pz + 3, 'minecraft:sea_lantern')
  // 储藏柜（两个桶）
  set(px - 5, py + 1, pz - 5, 'minecraft:barrel[facing=up]')
  set(px - 5, py + 1, pz + 5, 'minecraft:barrel[facing=up]')

  // ---------- 三、待客厅（中间 x=px-3..px+2）----------
  // 沙发：底座 + 靠背（朝北，面向电视墙）
  fill(px - 3, py + 1, pz + 3, px - 1, py + 1, pz + 3, 'minecraft:white_wool')
  fill(px - 3, py + 2, pz + 3, px - 2, py + 2, pz + 3, 'minecraft:white_wool')
  // 茶几
  set(px, py + 1, pz + 3, 'minecraft:oak_fence')
  set(px, py + 2, pz + 3, 'minecraft:smooth_quartz_slab')
  // 电视墙（北墙内侧 z=pz-6）
  fill(px - 3, py + 1, pz - 6, px + 2, py + 3, pz - 6, 'minecraft:polished_blackstone_bricks')
  // 主吊灯
  set(px, py + 3, pz + 1, 'minecraft:sea_lantern')
  // 绿植
  set(px - 1, py + 1, pz - 4, 'minecraft:potted_fern')

  // ---------- 四、楼梯间 + 仓管室（东间 x=px+4..px+9）----------
  // 仓管区沿东墙 x=px+9 三个桶（避开 z=pz+4 的梯子井活板门）
  set(px + 9, py + 1, pz - 2, 'minecraft:barrel[facing=up]')
  set(px + 9, py + 1, pz + 1, 'minecraft:barrel[facing=up]')
  set(px + 9, py + 1, pz + 3, 'minecraft:barrel[facing=up]')
  // 沿北墙 z=pz-6 两个桶
  set(px + 6, py + 1, pz - 6, 'minecraft:barrel[facing=up]')
  set(px + 8, py + 1, pz - 6, 'minecraft:barrel[facing=up]')
  // 吊灯
  set(px + 8, py + 3, pz + 1, 'minecraft:sea_lantern')
}
