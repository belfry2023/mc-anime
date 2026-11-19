// ===== 哨站训练场：在玩家东边 120 格搭一座废弃祭坛并放唤魔者 =====
function buildAltar(server, p) {
  var runHere=cmd=>server.runCommandSilent('execute in '+p.level.dimension+' run '+cmd)
  var x = Math.floor(p.x) + 120
  var y = Math.floor(p.y)
  var z = Math.floor(p.z)
  for(var x0=(x-5)>>4;x0<=((x+5)>>4);x0++)for(var z0=(z-5)>>4;z0<=((z+5)>>4);z0++)p.level.getChunk(x0,z0)

  // 地基 + 残墙
  runHere(`fill ${x - 5} ${y - 1} ${z - 5} ${x + 5} ${y} ${z + 5} minecraft:stone_bricks`)
  runHere(`fill ${x - 5} ${y + 1} ${z - 5} ${x + 5} ${y + 3} ${z - 5} minecraft:cracked_stone_bricks`)
  runHere(`fill ${x - 5} ${y + 1} ${z + 5} ${x + 5} ${y + 3} ${z + 5} minecraft:mossy_stone_bricks`)
  // 四根残柱
  runHere(`fill ${x - 5} ${y + 1} ${z - 5} ${x - 5} ${y + 4} ${z - 5} minecraft:cracked_stone_bricks`)
  runHere(`fill ${x + 5} ${y + 1} ${z - 5} ${x + 5} ${y + 4} ${z - 5} minecraft:cracked_stone_bricks`)
  runHere(`fill ${x - 5} ${y + 1} ${z + 5} ${x - 5} ${y + 4} ${z + 5} minecraft:mossy_stone_bricks`)
  runHere(`fill ${x + 5} ${y + 1} ${z + 5} ${x + 5} ${y + 4} ${z + 5} minecraft:mossy_stone_bricks`)
  // 中间石台 + 火 + 网
  runHere(`fill ${x - 1} ${y + 1} ${z - 1} ${x + 1} ${y + 2} ${z + 1} minecraft:stone_bricks`)
  runHere(`setblock ${x} ${y + 3} ${z} minecraft:soul_campfire`)
  runHere(`setblock ${x - 3} ${y + 2} ${z - 3} minecraft:cobweb`)
  runHere(`setblock ${x + 3} ${y + 2} ${z + 3} minecraft:cobweb`)
  runHere(`setblock ${x + 3} ${y + 2} ${z - 3} minecraft:cobweb`)
  runHere(`particle minecraft:soul_fire_flame ${x} ${y + 3} ${z} 1 0.5 1 0 20 normal`)

  // 唤魔者 + 卫道士
  runHere(`summon minecraft:evoker ${x + 2} ${y + 3} ${z + 2} {Tags:["mk_altar"],PersistenceRequired:1b}`)
  runHere(`summon minecraft:vindicator ${x - 2} ${y + 3} ${z + 2} {Tags:["mk_altar"],PersistenceRequired:1b}`)
  runHere(`summon minecraft:vindicator ${x + 1} ${y + 3} ${z - 2} {Tags:["mk_altar"],PersistenceRequired:1b}`)

  // 给一块指向祭坛的罗盘
  runHere(`give ${p.username} minecraft:compass{LodestonePos:{X:${x},Y:${y + 3},Z:${z}},LodestoneDimension:"${p.level.dimension}",LodestoneTracked:0b,display:{Name:'{"text":"祭坛罗盘","color":"light_purple"}'}} 1`)
  p.tell(`§5祭坛在你东边大约一百二十格（坐标 ${x} ${y} ${z}），夜里能看见一点绿火。`)
  runHere(`playsound minecraft:block.soul_sand.step neutral @a ${x} ${y} ${z} 1 0.6`)
}
// ===== 手动搭祭坛：/mkaltar =====
ServerEvents.commandRegistry(event => {
  var { commands: Commands } = event
  event.register(Commands.literal('mkaltar').executes(ctx => {
    var player = ctx.source.player
    if (!player) return 0
    buildAltar(ctx.source.server, player)
    player.tell('§a祭坛搭好了，去东边看看。')
    return 1
  }))
})
// ===== 塌塔支线：西边 150 格的塌塔 + 地下巢穴 + 先驱 =====
function buildLair(server, p) {
  var runHere=cmd=>server.runCommandSilent('execute in '+p.level.dimension+' run '+cmd)
  var bx = Math.floor(p.x) - 150
  var by = Math.floor(p.y)
  var bz = Math.floor(p.z)
  var bottom = by - 12
  for(var x0=(bx-9)>>4;x0<=((bx+9)>>4);x0++)for(var z0=(bz-9)>>4;z0<=((bz+9)>>4);z0++)p.level.getChunk(x0,z0)

  // 地面：塌了一半的瞭望塔
  runHere(`fill ${bx - 3} ${by - 1} ${bz - 3} ${bx + 3} ${by - 1} ${bz + 3} minecraft:cracked_stone_bricks`)
  runHere(`fill ${bx - 3} ${by} ${bz - 3} ${bx - 3} ${by + 5} ${bz - 3} minecraft:stone_bricks`)
  runHere(`fill ${bx + 3} ${by} ${bz - 3} ${bx + 3} ${by + 4} ${bz - 3} minecraft:mossy_stone_bricks`)
  runHere(`fill ${bx - 3} ${by} ${bz + 3} ${bx - 3} ${by + 3} ${bz + 3} minecraft:cracked_stone_bricks`)
  runHere(`fill ${bx - 2} ${by} ${bz - 3} ${bx + 2} ${by + 2} ${bz - 3} minecraft:stone_bricks`)
  runHere(`setblock ${bx} ${by + 1} ${bz} minecraft:campfire`)
  runHere(`setblock ${bx + 2} ${by + 5} ${bz} minecraft:chain`)
  runHere(`setblock ${bx - 2} ${by + 5} ${bz} minecraft:chain`)
  runHere(`particle minecraft:block minecraft:redstone_block ${bx} ${by + 1} ${bz} 3 1 3 0 30 normal`)

  // 竖井（脚手架可直接爬）
  runHere(`fill ${bx} ${by} ${bz} ${bx} ${by - 3} ${bz} minecraft:air`)
  runHere(`fill ${bx} ${by - 1} ${bz} ${bx} ${bottom + 1} ${bz} minecraft:scaffolding`)

  // 地下大厅
  runHere(`fill ${bx - 9} ${bottom - 1} ${bz - 9} ${bx + 9} ${bottom + 7} ${bz + 9} minecraft:air`)
  runHere(`fill ${bx - 9} ${bottom - 1} ${bz - 9} ${bx + 9} ${bottom - 1} ${bz + 9} minecraft:polished_deepslate`)
  runHere(`fill ${bx - 9} ${bottom + 7} ${bz - 9} ${bx + 9} ${bottom + 7} ${bz + 9} minecraft:deepslate_tiles`)
  runHere(`fill ${bx - 9} ${bottom} ${bz - 9} ${bx + 9} ${bottom + 6} ${bz - 9} minecraft:deepslate_bricks`)
  runHere(`fill ${bx - 9} ${bottom} ${bz + 9} ${bx + 9} ${bottom + 6} ${bz + 9} minecraft:deepslate_bricks`)
  runHere(`fill ${bx - 9} ${bottom} ${bz - 9} ${bx - 9} ${bottom + 6} ${bz + 9} minecraft:deepslate_bricks`)
  runHere(`fill ${bx + 9} ${bottom} ${bz - 9} ${bx + 9} ${bottom + 6} ${bz + 9} minecraft:deepslate_bricks`)

  // 中央台 + 灵魂火
  runHere(`fill ${bx - 2} ${bottom} ${bz - 2} ${bx + 2} ${bottom + 1} ${bz + 2} minecraft:polished_blackstone_bricks`)
  runHere(`setblock ${bx} ${bottom + 2} ${bz} minecraft:soul_fire`)

  // 四个铁笼，里面是“饲料”
  for (var o of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) {
    runHere(`fill ${bx + o[0] - 1} ${bottom} ${bz + o[1] - 1} ${bx + o[0] + 1} ${bottom + 2} ${bz + o[1] + 1} minecraft:iron_bars hollow`)
    runHere(`summon minecraft:husk ${bx + o[0]} ${bottom} ${bz + o[1]} {Tags:["mk_cage"],PersistenceRequired:1b,Silent:1b}`)
  }

  // 灯与网
  runHere(`setblock ${bx - 7} ${bottom + 5} ${bz - 7} minecraft:lantern`)
  runHere(`setblock ${bx + 7} ${bottom + 5} ${bz - 7} minecraft:lantern`)
  runHere(`setblock ${bx - 7} ${bottom + 5} ${bz + 7} minecraft:lantern`)
  runHere(`setblock ${bx + 7} ${bottom + 5} ${bz + 7} minecraft:lantern`)
  runHere(`setblock ${bx + 5} ${bottom + 3} ${bz - 5} minecraft:cobweb`)
  runHere(`setblock ${bx - 5} ${bottom + 3} ${bz + 5} minecraft:cobweb`)

  // 先驱与两名牧犬
  runHere(`summon cataclysm:the_harbinger ${bx} ${bottom + 2} ${bz} {Tags:["mk_lair","mk_boss"],PersistenceRequired:1b}`)
  runHere(`summon minecraft:vindicator ${bx + 4} ${bottom} ${bz + 2} {Tags:["mk_lair_guard"],PersistenceRequired:1b}`)
  runHere(`summon minecraft:pillager ${bx - 4} ${bottom} ${bz - 2} {Tags:["mk_lair_guard"],PersistenceRequired:1b}`)

  // 指路罗盘
  runHere(`give ${p.username} minecraft:compass{LodestonePos:{X:${bx},Y:${by},Z:${bz}},LodestoneDimension:"${p.level.dimension}",LodestoneTracked:0b,display:{Name:'{"text":"塔底罗盘","color":"dark_purple"}'}} 1`)
  p.tell(`§5塌塔在西边，坐标 ${bx} ${by} ${bz}。塔心有脚手架，顺着下去。`)
  runHere(`playsound minecraft:block.deepslate_bricks.break neutral @a ${bx} ${bottom + 2} ${bz} 1 0.7`)
}

// ===== 手动搭巢穴：/mklair =====
ServerEvents.commandRegistry(event => {
  var { commands: Commands } = event
  event.register(Commands.literal('mklair').executes(ctx => {
    var player = ctx.source.player
    if (!player) return 0
    buildLair(ctx.source.server, player)
    player.tell('§a塔搭好了，罗盘在包里。')
    return 1
  }))
})
;
// Personal, event-driven chapters. An objective already achieved counts when its chapter opens.
(function () {
  var chapters=[
    ['rollcall','失去回声的哨站','海底电缆传来昨晚的求救声，呼号却属于明天。斯塔把名册放在餐桌上，四个名字都由你签收。','集合四名队员，在同一维度输入 /mkcheck。'],
    ['sight','第二双眼睛','纸板狐捂住了你的灯。「墙后那一点蓝光，看到了吗？它走的是昨晚巡逻的路线。」','带纸板狐进入野外，让她看见一个敌人。可用 /mkaltar 建立训练祭坛。'],
    ['domain','钟响时停火','圣女听出回声间隔正好是一把刀落下的时间。她要你站在墙后，看哪些东西会被留下。','在野外让圣女或斯塔·柏成功展开一次领域。'],
    ['jenny','归航坐标','失踪的领航员珍妮在哨站留了一颗末影珍珠。背面刻着一句话：带我回家的时候，记得先把门打开。','使用 /mkjenny recruit 招募珍妮，再在营地用 /mkjenny sethome 写下坐标。'],
    ['boss','潮声的源头','海底第三盏信号灯亮起。纸板狐报出方位，斯塔合上枪托，魔法女仆已经拔刀。','由你、自己的队员或式神击败一名敌对首领。暖海卫城的斯库拉、凋灵均可。']
  ]
  function stage(p){var i=0;while(i<chapters.length && p.persistentData.getBoolean('mkQuest_'+chapters[i][0]))i++;return i}
  function brief(p) {
    var n=stage(p)
    if(n===chapters.length){p.tell('§b终章 · 天亮后，哨站收到第一份实时潮汐表。珍妮把写着四个呼号的灯重新挂到门廊。');return}
    var a=chapters[n];p.tell('§6第 '+(n+1)+' 章 · '+a[1]);p.tell('§7'+a[2]);p.tell('§a目标 · '+a[3])
  }
  global.mkBrief=brief
  global.mkQuestMark=(p,id)=>{
    if(!p || p.persistentData.getBoolean('mkQuest_'+id))return
    var before=stage(p)
    p.persistentData.putBoolean('mkQuest_'+id,true)
    if (before!==stage(p))brief(p)
  }
  PlayerEvents.loggedIn(e=>{if (!e.player.persistentData.getBoolean('mkDebriefed')) {
    e.player.persistentData.putBoolean('mkDebriefed',true);brief(e.player)
  }})
  ServerEvents.commandRegistry(e=>e.register(e.commands.literal('mkstatus').executes(c=>{brief(c.source.playerOrException);return 1})))
})()
