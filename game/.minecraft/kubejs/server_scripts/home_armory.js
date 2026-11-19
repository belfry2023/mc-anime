// home_armory.js —— 地下武库模块
// 由 home.js 的 buildHome() 在楼梯之后调用：global.mkHomeArmory(env)
// 范围：x=ax0..ax1、z=az0..az1、y=ay0..ay1（房屋正下方，全部海晶灯）
//   ay0 = py-8 地板层；室内空气 y=py-7..py-4；ay1 = py-3 天花板层
//   三隔间：西=武器制造车间(px-9..px-4) / 中=展厅连廊(px-2..px+2) / 东=仓管室(px+4..px+9)
// 梯子井：lx=px+9, lz=pz+4，竖井 py-7..py 通到一层地面(py+1 活板门)

global.mkHomeArmory = function (env) {
  var px = env.px
  var py = env.py
  var pz = env.pz
  var ax0 = env.ax0
  var ax1 = env.ax1
  var ay0 = env.ay0
  var ay1 = env.ay1
  var az0 = env.az0
  var az1 = env.az1

  var floorY = ay0 + 1 // py-7：室内地面层
  var ceilY = ay1 - 1  // py-4：室内最高一层空气

  // ---------- 一、挖空整个腔体 ----------
  env.fill(ax0, ay0, az0, ax1, ay1, az1, 'minecraft:air')

  // ---------- 二、海晶灯六面（内空 py-7..py-4 保持 air） ----------
  env.fill(ax0, ay0, az0, ax1, ay0, az1, 'minecraft:sea_lantern')          // 地板
  env.fill(ax0, ay1, az0, ax1, ay1, az1, 'minecraft:sea_lantern')          // 天花板
  env.fill(ax0, ay0 + 1, az0, ax1, ay1 - 1, az0, 'minecraft:sea_lantern')  // 北墙 z=az0
  env.fill(ax0, ay0 + 1, az1, ax1, ay1 - 1, az1, 'minecraft:sea_lantern')  // 南墙 z=az1
  env.fill(ax0, ay0 + 1, az0, ax0, ay1 - 1, az1, 'minecraft:sea_lantern')  // 西墙 x=ax0
  env.fill(ax1, ay0 + 1, az0, ax1, ay1 - 1, az1, 'minecraft:sea_lantern')  // 东墙 x=ax1

  // ---------- 三、南北向隔墙（海晶灯，Y=py-7..py-4，Z=az0+1..az1-1） ----------
  env.fill(px - 3, floorY, az0 + 1, px - 3, ceilY, az1 - 1, 'minecraft:sea_lantern') // 西隔墙
  env.fill(px + 3, floorY, az0 + 1, px + 3, ceilY, az1 - 1, 'minecraft:sea_lantern') // 东隔墙

  // 隔墙门洞（1 宽 × 2 高，z=pz）
  env.fill(px - 3, floorY, pz, px - 3, floorY + 1, pz, 'minecraft:air')
  env.fill(px + 3, floorY, pz, px + 3, floorY + 1, pz, 'minecraft:air')

  // ---------- 四、武器制造车间（西间 x=px-9..px-4） ----------
  // 沿西墙一排工作设备（北 → 南），全部站在 y=py-7 地面上
  env.set(px - 9, floorY, pz - 6, 'minecraft:barrel[facing=up]')
  env.set(px - 9, floorY, pz - 5, 'minecraft:smithing_table')
  env.set(px - 9, floorY, pz - 3, 'minecraft:blast_furnace[facing=north]')
  env.set(px - 9, floorY, pz - 1, 'minecraft:anvil[facing=north]')
  env.set(px - 9, floorY, pz + 1, 'minecraft:grindstone')
  env.set(px - 9, floorY, pz + 3, 'minecraft:crafting_table')
  env.set(px - 9, floorY, pz + 5, 'minecraft:fletching_table')
  env.set(px - 9, floorY, pz + 6, 'minecraft:barrel[facing=up]')

  // ---------- 五、展厅连廊（中间 x=px-2..px+2） ----------
  // 四座展台：石英柱 2 格 + 石英台阶顶盖（z=pz-3 / pz-1 / pz+1 / pz+3）
  var dz = -3
  while (dz <= 3) {
    env.set(px, floorY, pz + dz, 'minecraft:quartz_pillar[axis=y]')
    env.set(px, floorY + 1, pz + dz, 'minecraft:quartz_pillar[axis=y]')
    env.set(px, floorY + 2, pz + dz, 'minecraft:smooth_quartz_slab')
    dz = dz + 2
  }

  // 展台之间的两尊盔甲架（剑 / 斧）
  env.run('execute unless entity @e[type=minecraft:armor_stand,tag=mk_home_display,x=' + px + ',y=' + floorY + ',z=' + (pz - 2) + ',distance=..0.9] run summon minecraft:armor_stand ' + (px) + ' ' + (py - 7) + ' ' + (pz - 2) + ' {Tags:["mk_home_display"],NoGravity:1b,ShowArms:1b,Invulnerable:1b,NoBasePlate:1b,HandItems:[{id:"minecraft:netherite_sword",Count:1b},{}]}')
  env.run('execute unless entity @e[type=minecraft:armor_stand,tag=mk_home_display,x=' + px + ',y=' + floorY + ',z=' + (pz + 2) + ',distance=..0.9] run summon minecraft:armor_stand ' + (px) + ' ' + (py - 7) + ' ' + (pz + 2) + ' {Tags:["mk_home_display"],NoGravity:1b,ShowArms:1b,Invulnerable:1b,NoBasePlate:1b,HandItems:[{id:"minecraft:netherite_axe",Count:1b},{}]}')

  // ---------- 六、仓管室（东间 x=px+4..px+9） ----------
  // 东墙 x=px+9 一排桶（避让 z=pz+4 的梯子井）
  env.set(px + 9, floorY, pz - 6, 'minecraft:barrel[facing=up]')
  env.set(px + 9, floorY, pz - 4, 'minecraft:barrel[facing=up]')
  env.set(px + 9, floorY, pz - 2, 'minecraft:barrel[facing=up]')
  // 北墙 z=az0+1 一排桶
  env.set(px + 5, floorY, az0 + 1, 'minecraft:barrel[facing=up]')
  env.set(px + 6, floorY, az0 + 1, 'minecraft:barrel[facing=up]')
  env.set(px + 7, floorY, az0 + 1, 'minecraft:barrel[facing=up]')

  // 三个带物资的箱子（y=py-7 地面上）
  env.set(px + 8, floorY, pz - 2, 'minecraft:chest{Items:[{Slot:0b,id:"minecraft:netherite_chestplate",Count:1b},{Slot:1b,id:"minecraft:netherite_leggings",Count:1b},{Slot:2b,id:"minecraft:netherite_boots",Count:1b},{Slot:3b,id:"minecraft:netherite_helmet",Count:1b}]}')
  env.set(px + 8, floorY, pz, 'minecraft:chest{Items:[{Slot:0b,id:"tacz:modern_kinetic_gun",Count:1b,tag:{GunId:"tacz:m107"}},{Slot:1b,id:"tacz:modern_kinetic_gun",Count:1b,tag:{GunId:"lradd:qbz191_em"}},{Slot:2b,id:"tacz:ammo",Count:64b,tag:{AmmoId:"tacz:58x42"}},{Slot:3b,id:"tacz:ammo",Count:64b,tag:{AmmoId:"tacz:50bmg"}}]}')
  env.set(px + 8, floorY, pz + 2, 'minecraft:chest{Items:[{Slot:0b,id:"minecraft:golden_apple",Count:16b},{Slot:1b,id:"minecraft:enchanted_golden_apple",Count:4b},{Slot:2b,id:"minecraft:totem_of_undying",Count:2b}]}')

  // ---------- 七、梯子井（武库 → 一层，lx=px+9, lz=pz+4，靠东墙） ----------
  var lx = px + 9
  var lz = pz + 4
  // 竖井挖到一层地板下方（py-1），梯子到 py-1；活板门在地板层 py（与 birch_planks 齐平，脚底才在 py+1）
  env.fill(lx, floorY, lz, lx, py - 1, lz, 'minecraft:air')
  env.fill(lx, floorY, lz, lx, py - 1, lz, 'minecraft:ladder[facing=west]')
  env.set(lx, py, lz, 'minecraft:oak_trapdoor[facing=west,half=bottom,open=false]')
}
