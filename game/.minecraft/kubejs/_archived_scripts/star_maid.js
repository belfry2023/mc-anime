// /mkstar —— 补偿女仆：斯塔·柏
// 好感拉满、1000 血、整套饰品与女仆强化装备
const MK_BAUBLES = [
  'touhou_little_maid:explosion_protect_bauble',
  'touhou_little_maid:fire_protect_bauble',
  'touhou_little_maid:projectile_protect_bauble',
  'touhou_little_maid:magic_protect_bauble',
  'touhou_little_maid:fall_protect_bauble',
  'touhou_little_maid:drown_protect_bauble',
  'touhou_little_maid:item_magnet_bauble',
  // 性格饰品：恋爱脑 / 一见钟情 / 傲娇 / 三无 / 贪吃 / 肉食派 / 怕死
  'touhou_little_maid_personality:budding_affection',
  'touhou_little_maid_personality:freeze_this_moment',
  'touhou_little_maid_personality:reserved_sweetness',
  'touhou_little_maid_personality:name_knot',
  'touhou_little_maid_personality:krabby_patty',
  'touhou_little_maid_personality:giant_steak',
  'touhou_little_maid_personality:unfinished_dream'
]

function baubleItems() {
  const items = []
  MK_BAUBLES.forEach((id, i) => items.push(`{Slot:${i}b,id:"${id}",Count:1b}`))
  return `{Size:30,Items:[${items.join(',')}]}`
}

ServerEvents.commandRegistry(event => {
  const { commands: Commands } = event

  event.register(Commands.literal('mkstar').executes(ctx => {
    const p = ctx.source.player
    if (!p) { return 0 }
    const server = ctx.source.server

    server.runCommandSilent(`execute at ${p.username} run summon touhou_little_maid:maid ~ ~ ~ {` +
      `CustomName:'{"text":"斯塔·柏","color":"light_purple"}',` +
      `ModelId:"touhou_little_maid_spell:stellar_witch",` +
      `SoundPackId:"touhou_little_maid:default",` +
      `MaidFavorability:1000,Favorability:1000,` +
      `NoAI:0b,Invulnerable:0b,Silent:0b,Health:1000.0f,` +
      `PersistenceRequired:1b}`)
    server.runCommandSilent(`execute as @e[type=touhou_little_maid:maid,sort=nearest,limit=1] run data modify entity @s Owner set from entity ${p.username} UUID`)
    server.runCommandSilent('execute as @e[type=touhou_little_maid:maid,sort=nearest,limit=1] run attribute @s minecraft:generic.max_health base set 1000')
    server.runCommandSilent('execute as @e[type=touhou_little_maid:maid,sort=nearest,limit=1] run data merge entity @s {Health:1000.0f}')
    server.runCommandSilent('execute as @e[type=touhou_little_maid:maid,sort=nearest,limit=1] run data merge entity @s ' + baubleItems())
    server.runCommandSilent('execute as @e[type=touhou_little_maid:maid,sort=nearest,limit=1] run effect give @s minecraft:resistance infinite 3 true')
    server.runCommandSilent('execute as @e[type=touhou_little_maid:maid,sort=nearest,limit=1] run effect give @s minecraft:regeneration infinite 2 true')
    server.runCommandSilent('execute as @e[type=touhou_little_maid:maid,sort=nearest,limit=1] run effect give @s minecraft:fire_resistance infinite 1 true')
    server.runCommandSilent('execute as @e[type=touhou_little_maid:maid,sort=nearest,limit=1] run effect give @s minecraft:water_breathing infinite 1 true')

    // 给她配把好枪和甲（放在她的物品栏里，不是玩家背包）
    server.runCommandSilent('execute as @e[type=touhou_little_maid:maid,sort=nearest,limit=1] run item replace entity @s weapon.mainhand with tacz:modern_kinetic_gun{GunId:"tacz:m107",GunCurrentAmmoCount:10,HasBulletInBarrel:1b} 1')
    server.runCommandSilent('execute as @e[type=touhou_little_maid:maid,sort=nearest,limit=1] run item replace entity @s armor.head with minecraft:netherite_helmet{Enchantments:[{id:"protection",lvl:4}]} 1')
    server.runCommandSilent('execute as @e[type=touhou_little_maid:maid,sort=nearest,limit=1] run item replace entity @s armor.chest with minecraft:netherite_chestplate{Enchantments:[{id:"protection",lvl:4}]} 1')
    server.runCommandSilent('execute as @e[type=touhou_little_maid:maid,sort=nearest,limit=1] run item replace entity @s armor.legs with minecraft:netherite_leggings{Enchantments:[{id:"protection",lvl:4}]} 1')
    server.runCommandSilent('execute as @e[type=touhou_little_maid:maid,sort=nearest,limit=1] run item replace entity @s armor.feet with minecraft:netherite_boots{Enchantments:[{id:"protection",lvl:4}]} 1')

    // 万法皆通：给她一本法术书放副手；任务切到「法术战斗」由玩家在女仆界面点
    server.runCommandSilent('execute as @e[type=touhou_little_maid:maid,sort=nearest,limit=1] run item replace entity @s weapon.offhand with touhou_little_maid_spell:spell_book 1')
    server.runCommandSilent('execute as @e[type=touhou_little_maid:maid,sort=nearest,limit=1] run item replace entity @s weapon.mainhand with tacz:modern_kinetic_gun{GunId:"tacz:m107",GunCurrentAmmoCount:10,HasBulletInBarrel:1b} 1')

    server.runCommandSilent(`title ${p.username} subtitle {"text":"这次是补偿。","color":"light_purple"}`)
    server.runCommandSilent(`title ${p.username} title {"text":"斯塔·柏","color":"light_purple"}`)
    p.tell('§d斯塔·柏已经站在你面前了。好感 1000、血 1000，七件保护饰品 + 七件性格饰品（恋爱脑/一见钟情/傲娇/三无/贪吃/肉食派/怕死）都塞进了她的饰品栏。')
    p.tell('§7性格编辑器最多选 2 个是它的界面限制；想要更多，先用她身上的性格饰品顶着——效果一样。')
    return 1
  }))
})
