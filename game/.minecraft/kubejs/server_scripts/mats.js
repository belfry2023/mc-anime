// ===== /mkmats —— 一键领取「建造用」全套材料（每种 4 组 = 256 个） =====
// 用途：盖殖民地 / 盖城堡 / 玩 Structurize 蓝图时，懒得一个个找材料。
//       会把材料按 64 一组塞进你身前的箱子阵列（每种 4 组），不会掉一地。
// 用法：
//   /mkmats        在身前生成 39 个箱子（3 排 × 13 个）并装满材料
//   /mkmats count  只告诉你这次会发多少种材料
// 说明：
//   - 建议在平地上、面朝一块空地执行；箱子区域 = 你前方 2~6 格、左右各 12 格。
//   - 超出箱子容量的极个别材料会被跳过（当前容量 1053 格，够用）。
//   - 只发「建造方块/建材/家具/光源/工作台」，不含武器、食物、矿物原矿。
//   - 箱子是普通箱子，拆掉就行。

// 建造材料清单（Minecraft 1.20.1 原版方块，全部是常用建材）
var MK_MATS = [
  // —— 石材 / 石砖 ——
  'minecraft:stone', 'minecraft:cobblestone', 'minecraft:mossy_cobblestone',
  'minecraft:stone_bricks', 'minecraft:mossy_stone_bricks', 'minecraft:cracked_stone_bricks',
  'minecraft:chiseled_stone_bricks', 'minecraft:smooth_stone',
  'minecraft:stone_slab', 'minecraft:stone_brick_slab', 'minecraft:stone_brick_stairs',
  'minecraft:stone_brick_wall', 'minecraft:cobblestone_stairs', 'minecraft:cobblestone_slab',
  'minecraft:cobblestone_wall',
  // —— 花岗岩 / 闪长岩 / 安山岩 ——
  'minecraft:granite', 'minecraft:polished_granite', 'minecraft:granite_slab', 'minecraft:granite_stairs',
  'minecraft:diorite', 'minecraft:polished_diorite', 'minecraft:diorite_slab', 'minecraft:diorite_stairs',
  'minecraft:andesite', 'minecraft:polished_andesite', 'minecraft:andesite_slab', 'minecraft:andesite_stairs',
  // —— 深板岩 ——
  'minecraft:deepslate', 'minecraft:cobbled_deepslate', 'minecraft:polished_deepslate',
  'minecraft:deepslate_bricks', 'minecraft:deepslate_tiles', 'minecraft:chiseled_deepslate',
  'minecraft:cracked_deepslate_bricks', 'minecraft:cracked_deepslate_tiles',
  'minecraft:deepslate_tile_slab', 'minecraft:deepslate_tile_stairs', 'minecraft:deepslate_tile_wall',
  'minecraft:cobbled_deepslate_slab', 'minecraft:cobbled_deepslate_stairs', 'minecraft:cobbled_deepslate_wall',
  // —— 其他石类 ——
  'minecraft:tuff', 'minecraft:calcite', 'minecraft:dripstone_block', 'minecraft:mud_bricks',
  'minecraft:packed_mud', 'minecraft:bricks', 'minecraft:brick_slab', 'minecraft:brick_stairs', 'minecraft:brick_wall',
  'minecraft:sandstone', 'minecraft:cut_sandstone', 'minecraft:chiseled_sandstone', 'minecraft:smooth_sandstone',
  'minecraft:sandstone_slab', 'minecraft:sandstone_stairs',
  'minecraft:red_sandstone', 'minecraft:cut_red_sandstone', 'minecraft:smooth_red_sandstone',
  'minecraft:red_sandstone_slab', 'minecraft:red_sandstone_stairs',
  'minecraft:quartz_block', 'minecraft:smooth_quartz', 'minecraft:quartz_bricks', 'minecraft:chiseled_quartz_block',
  'minecraft:quartz_pillar', 'minecraft:quartz_slab', 'minecraft:quartz_stairs',
  'minecraft:purpur_block', 'minecraft:purpur_pillar', 'minecraft:purpur_slab', 'minecraft:purpur_stairs',
  'minecraft:prismarine', 'minecraft:prismarine_bricks', 'minecraft:dark_prismarine',
  'minecraft:prismarine_slab', 'minecraft:prismarine_stairs', 'minecraft:prismarine_wall',
  'minecraft:end_stone', 'minecraft:end_stone_bricks', 'minecraft:end_stone_brick_slab', 'minecraft:end_stone_brick_stairs',
  'minecraft:nether_bricks', 'minecraft:red_nether_bricks', 'minecraft:chiseled_nether_bricks',
  'minecraft:cracked_nether_bricks', 'minecraft:nether_brick_slab', 'minecraft:nether_brick_stairs', 'minecraft:nether_brick_fence',
  'minecraft:blackstone', 'minecraft:polished_blackstone', 'minecraft:polished_blackstone_bricks',
  'minecraft:chiseled_polished_blackstone', 'minecraft:cracked_polished_blackstone_bricks', 'minecraft:gilded_blackstone',
  'minecraft:blackstone_slab', 'minecraft:blackstone_stairs', 'minecraft:polished_blackstone_slab', 'minecraft:polished_blackstone_stairs',
  'minecraft:basalt', 'minecraft:polished_basalt', 'minecraft:obsidian', 'minecraft:crying_obsidian', 'minecraft:amethyst_block',
  // —— 金属块 / 功能方块 ——
  'minecraft:iron_block', 'minecraft:gold_block', 'minecraft:copper_block', 'minecraft:lapis_block',
  'minecraft:coal_block', 'minecraft:redstone_block', 'minecraft:emerald_block', 'minecraft:diamond_block',
  'minecraft:netherite_block', 'minecraft:hay_block', 'minecraft:dried_kelp_block',
  'minecraft:bookshelf', 'minecraft:crafting_table', 'minecraft:furnace', 'minecraft:blast_furnace',
  'minecraft:smoker', 'minecraft:chest', 'minecraft:barrel', 'minecraft:anvil', 'minecraft:smithing_table',
  'minecraft:grindstone', 'minecraft:cauldron', 'minecraft:brewing_stand', 'minecraft:hopper', 'minecraft:composter',
  'minecraft:dispenser', 'minecraft:dropper', 'minecraft:observer', 'minecraft:piston', 'minecraft:sticky_piston',
  'minecraft:ladder', 'minecraft:scaffolding', 'minecraft:chain', 'minecraft:iron_bars',
  // —— 玻璃 / 光源 ——
  'minecraft:glass', 'minecraft:glass_pane', 'minecraft:tinted_glass',
  'minecraft:glowstone', 'minecraft:sea_lantern', 'minecraft:shroomlight', 'minecraft:redstone_lamp',
  'minecraft:lantern', 'minecraft:soul_lantern', 'minecraft:torch', 'minecraft:soul_torch',
  'minecraft:campfire', 'minecraft:soul_campfire', 'minecraft:jack_o_lantern', 'minecraft:carved_pumpkin',
  // —— 羊毛 16 色 ——
  'minecraft:white_wool', 'minecraft:orange_wool', 'minecraft:magenta_wool', 'minecraft:light_blue_wool',
  'minecraft:yellow_wool', 'minecraft:lime_wool', 'minecraft:pink_wool', 'minecraft:gray_wool',
  'minecraft:light_gray_wool', 'minecraft:cyan_wool', 'minecraft:purple_wool', 'minecraft:blue_wool',
  'minecraft:brown_wool', 'minecraft:green_wool', 'minecraft:red_wool', 'minecraft:black_wool',
  // —— 混凝土 16 色 ——
  'minecraft:white_concrete', 'minecraft:orange_concrete', 'minecraft:magenta_concrete', 'minecraft:light_blue_concrete',
  'minecraft:yellow_concrete', 'minecraft:lime_concrete', 'minecraft:pink_concrete', 'minecraft:gray_concrete',
  'minecraft:light_gray_concrete', 'minecraft:cyan_concrete', 'minecraft:purple_concrete', 'minecraft:blue_concrete',
  'minecraft:brown_concrete', 'minecraft:green_concrete', 'minecraft:red_concrete', 'minecraft:black_concrete',
  // —— 木材（9 种板材） ——
  'minecraft:oak_planks', 'minecraft:spruce_planks', 'minecraft:birch_planks', 'minecraft:jungle_planks',
  'minecraft:acacia_planks', 'minecraft:dark_oak_planks', 'minecraft:mangrove_planks', 'minecraft:cherry_planks',
  'minecraft:bamboo_planks',
  // —— 原木 ——
  'minecraft:oak_log', 'minecraft:spruce_log', 'minecraft:birch_log', 'minecraft:jungle_log',
  'minecraft:acacia_log', 'minecraft:dark_oak_log', 'minecraft:mangrove_log', 'minecraft:cherry_log',
  // —— 木制配件 ——
  'minecraft:oak_slab', 'minecraft:spruce_slab', 'minecraft:birch_slab',
  'minecraft:oak_stairs', 'minecraft:spruce_stairs', 'minecraft:birch_stairs',
  'minecraft:oak_fence', 'minecraft:spruce_fence', 'minecraft:birch_fence',
  'minecraft:oak_fence_gate', 'minecraft:spruce_fence_gate', 'minecraft:birch_fence_gate',
  'minecraft:oak_door', 'minecraft:spruce_door', 'minecraft:birch_door', 'minecraft:dark_oak_door',
  'minecraft:oak_trapdoor', 'minecraft:spruce_trapdoor', 'minecraft:birch_trapdoor',
  // —— 种田 / 装饰小件 ——
  'minecraft:dirt', 'minecraft:grass_block', 'minecraft:gravel', 'minecraft:clay',
  'minecraft:white_stained_glass', 'minecraft:gray_stained_glass', 'minecraft:brown_stained_glass',
  'minecraft:flower_pot', 'minecraft:armor_stand', 'minecraft:item_frame', 'minecraft:painting',
  'minecraft:oak_sapling', 'minecraft:white_carpet', 'minecraft:red_carpet'
]

var MK_MATS_PER_TYPE = 4          // 每种给几组
var MK_MATS_CHEST_ROWS = 3        // 箱子排数
var MK_MATS_CHEST_COLS = 13       // 每排几个箱子（间隔 2 格，避免并成大箱子）
var MK_MATS_SLOTS_PER_CHEST = 27

function mkMatsBuild(server, player) {
  var px = Math.floor(player.x)
  var py = Math.floor(player.y)
  var pz = Math.floor(player.z)
  var dim = String(player.level.dimension)
  function run(cmd) {
    server.runCommandSilent('execute in ' + dim + ' run ' + cmd)
  }

  // 1) 摆箱子阵列：玩家前方，左右各 12 格，3 排
  var chests = []
  for (var row = 0; row < MK_MATS_CHEST_ROWS; row++) {
    for (var col = 0; col < MK_MATS_CHEST_COLS; col++) {
      var x = px - 12 + col * 2
      var z = pz + 2 + row * 2
      run('setblock ' + x + ' ' + py + ' ' + z + ' minecraft:chest replace')
      chests.push([x, py, z])
    }
  }

  var capacity = chests.length * MK_MATS_SLOTS_PER_CHEST
  var need = MK_MATS.length * MK_MATS_PER_TYPE

  // 2) 逐格填充（每种材料 4 组 = 4 个格子，每格 64 个）
  var idx = 0
  var placedTypes = 0
  for (var i = 0; i < MK_MATS.length; i++) {
    if (idx + MK_MATS_PER_TYPE > capacity) break
    for (var k = 0; k < MK_MATS_PER_TYPE; k++) {
      var c = Math.floor(idx / MK_MATS_SLOTS_PER_CHEST)
      var s = idx % MK_MATS_SLOTS_PER_CHEST
      var p = chests[c]
      run('item replace block ' + p[0] + ' ' + p[1] + ' ' + p[2] + ' container.' + s + ' with ' + MK_MATS[i] + ' 64')
      idx++
    }
    placedTypes++
  }

  player.tell('§a[建材] 已发放 §e' + placedTypes + '§a 种材料 × ' + MK_MATS_PER_TYPE + ' 组（共 ' +
    (placedTypes * MK_MATS_PER_TYPE) + ' 组），放在你前方的 ' + chests.length + ' 个箱子里。')
  if (placedTypes < MK_MATS.length) {
    player.tell('§e[建材] 箱子不够，还有 ' + (MK_MATS.length - placedTypes) + ' 种没放下（把箱子阵列清出来再执行一次）。')
  }
  player.tell('§7拆箱子前先把东西拿走；箱子位置：你前方 2~6 格、左右各 12 格、与脚同高。')
}

ServerEvents.commandRegistry(function (event) {
  var C = event.commands

  function pOf(ctx) { return ctx.source.player }

  event.register(
    C.literal('mkmats')
      .then(C.literal('count').executes(function (ctx) {
        var p = pOf(ctx)
        if (!p) return 0
        p.tell('§e[建材] 共 ' + MK_MATS.length + ' 种，每种 ' + MK_MATS_PER_TYPE + ' 组，合计 ' +
          (MK_MATS.length * MK_MATS_PER_TYPE) + ' 组。')
        return 1
      }))
      .executes(function (ctx) {
        var p = pOf(ctx)
        if (!p) return 0
        mkMatsBuild(ctx.source.server, p)
        return 1
      })
  )
})
