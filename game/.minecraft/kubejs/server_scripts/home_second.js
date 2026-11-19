// home_second.js —— 二层室内模块
// global.mkHomeSecond(env)：用白混凝土隔墙把二层分成西侧卧室与东侧工作室，并摆放家具
// 坐标系：二层地板 Y=py+4、室内空气 Y=py+5..py+7、屋顶 Y=py+8
// 楼梯井 x=px+3..px+6 / z=pz-3..pz+4 为绝对禁区，本脚本不在其中放置任何方块

global.mkHomeSecond = function(env) {
    var px = env.px;
    var py = env.py;
    var pz = env.pz;

    // ================= 1. 南北向隔墙：西卧室 / 东工作室 =================
    // 南端只铺到 z=pz+5，留出 (px+0, pz+6) 空位，使阳台门东半扇(px)的室内侧畅通
    env.fill(px + 0, py + 5, pz - 6, px + 0, py + 7, pz + 5, 'minecraft:white_concrete');

    // 隔墙门洞：1 宽 × 2 高，位于 z = pz + 3，连通卧室与工作室
    env.fill(px + 0, py + 5, pz + 3, px + 0, py + 6, pz + 3, 'minecraft:air');

    // ================= 2. 卧室（西间）：x = px-9..px-1，z = pz-6..pz+6 =================
    // 双人床：靠北墙，头朝南（foot 在北、head 在南）
    env.set(px - 6, py + 5, pz - 5, 'minecraft:red_bed[part=foot,facing=south]');
    env.set(px - 6, py + 5, pz - 4, 'minecraft:red_bed[part=head,facing=south]');

    // 床头柜（海晶灯，兼作照明）
    env.set(px - 5, py + 5, pz - 4, 'minecraft:sea_lantern');

    // 衣柜：沿西墙 x = px-9 摆 3 个木桶
    env.set(px - 9, py + 5, pz - 3, 'minecraft:barrel[facing=up]');
    env.set(px - 9, py + 5, pz - 1, 'minecraft:barrel[facing=up]');
    env.set(px - 9, py + 5, pz + 1, 'minecraft:barrel[facing=up]');

    // 灰色地毯
    env.fill(px - 7, py + 5, pz - 2, px - 5, py + 5, pz + 2, 'minecraft:gray_wool');

    // 吊灯
    env.set(px - 5, py + 7, pz + 2, 'minecraft:sea_lantern');

    // 绿植
    env.set(px - 2, py + 5, pz - 5, 'minecraft:potted_fern');

    // ================= 3. 工作室（东间）：x = px+1..px+9，z = pz-6..pz+6 =================
    // 书桌 + 椅子
    env.set(px + 3, py + 5, pz - 4, 'minecraft:smooth_quartz_slab');
    env.set(px + 3, py + 5, pz - 5, 'minecraft:oak_fence');

    // 书架：靠北墙 z = pz-6
    env.fill(px + 2, py + 5, pz - 6, px + 3, py + 6, pz - 6, 'minecraft:bookshelf');

    // 附魔台
    env.set(px + 2, py + 5, pz - 1, 'minecraft:enchanting_table');

    // 铁砧（原定 z=pz-1 会落进楼梯井禁区，改到北墙空位 z=pz-6，x 不变）
    env.set(px + 4, py + 5, pz - 6, 'minecraft:anvil[facing=north]');

    // 织布机（原定 z=pz-1 同样在楼梯井禁区内，改到北墙空位 z=pz-6，x 不变）
    env.set(px + 6, py + 5, pz - 6, 'minecraft:loom[facing=north]');

    // 切石机 / 工作台
    env.set(px + 7, py + 5, pz - 1, 'minecraft:stonecutter[facing=north]');
    env.set(px + 8, py + 5, pz - 1, 'minecraft:crafting_table');

    // 吊灯（原定 px+6/pz+2 正在楼梯井开口上方，移到东侧 px+8，y/z 不变）
    env.set(px + 8, py + 7, pz + 2, 'minecraft:sea_lantern');
};
