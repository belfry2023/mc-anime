// army.js v5 —— /mkarmy 四女仆（tag 认人）；/mkcheck 用可见输出自检
ServerEvents.commandRegistry(event => {
  const { commands: Commands } = event
  const MAID = 'touhou_little_maid:maid'
  const MODEL = 'touhou_little_maid_spell:stellar_witch'

  const BAUBLE_IDS = [
    'touhou_little_maid:explosion_protect_bauble',
    'touhou_little_maid:fire_protect_bauble',
    'touhou_little_maid:projectile_protect_bauble',
    'touhou_little_maid:magic_protect_bauble',
    'touhou_little_maid:fall_protect_bauble',
    'touhou_little_maid:drown_protect_bauble',
    'touhou_little_maid:item_magnet_bauble',
    'touhou_little_maid:mute_bauble',
    'touhou_little_maid_personality:budding_affection',
    'touhou_little_maid_personality:freeze_this_moment',
    'touhou_little_maid_personality:reserved_sweetness',
    'touhou_little_maid_personality:name_knot',
    'touhou_little_maid_personality:unfinished_dream',
    'touhou_little_maid_personality:glory_of_courage',
    'touhou_little_maid_personality:insatiable',
    'touhou_little_maid_personality:vessel_of_sin',
    'touhou_little_maid_personality:dead_shot',
    'touhou_little_maid_personality:krabby_patty',
    'touhou_little_maid_spell:arc_cross',
    'touhou_little_maid_spell:bleeding_heart',
    'touhou_little_maid_spell:flow_core',
    'touhou_little_maid_spell:quick_chant_ring',
    'touhou_little_maid_spell:spring_ring',
    'touhou_little_maid_spell:double_heart_chain',
    'touhou_little_maid_spell:dream_cat_crystal',
    'touhou_little_maid_spell:anchor_core',
    'touhou_little_maid_spell:ender_pocket',
    'touhou_little_maid_spell:returning_star',
    'maid_weapon:heartbound_knot',
    'maid_weapon:oath_ring'
  ]

  const BAUBLES = 'MaidBaubleInventory:{Size:30,Items:[' +
    BAUBLE_IDS.map((id, i) => `{Slot:${i}b,id:"${id}",Count:1b}`).join(',') + ']}'

  const EFFECTS = [
    'minecraft:speed', 'minecraft:haste', 'minecraft:strength', 'minecraft:jump_boost',
    'minecraft:regeneration', 'minecraft:resistance', 'minecraft:fire_resistance',
    'minecraft:water_breathing', 'minecraft:night_vision', 'minecraft:health_boost',
    'minecraft:absorption', 'minecraft:saturation', 'minecraft:luck', 'minecraft:slow_falling',
    'minecraft:dolphins_grace', 'minecraft:conduit_power', 'minecraft:hero_of_the_village',
    'irons_spellbooks:angel_wings', 'irons_spellbooks:fortify', 'irons_spellbooks:enchanted_ward',
    'irons_spellbooks:evasion', 'irons_spellbooks:charged', 'irons_spellbooks:vigor',
    'irons_spellbooks:oakskin', 'irons_spellbooks:planar_sight', 'irons_spellbooks:guided',
    'irons_spellbooks:echoing_strikes', 'irons_spellbooks:hastened',
    'irons_spellbooks:fall_damage_immunity'
  ]

  const ROLES = [
    { name: '圣女', tag: 'mk_saint', roleTag: 'mk_role_saint', dx: 2, dz: 2, main: 'minecraft:netherite_sword', off: 'irons_spellbooks:netherite_spell_book' },
    { name: '斯塔·柏', tag: 'mk_star', roleTag: 'mk_role_star', dx: -2, dz: 2, main: 'tacz:modern_kinetic_gun{GunId:"lradd:qbz191_em",GunCurrentAmmoCount:30,HasBulletInBarrel:1b}', off: 'irons_spellbooks:netherite_spell_book' },
    { name: '新春纸板狐', tag: 'mk_fox', roleTag: 'mk_role_fox', dx: 2, dz: -2, main: 'tacz:modern_kinetic_gun{GunId:"lradd:qbz191_em",GunCurrentAmmoCount:30,HasBulletInBarrel:1b}', off: '' },
    { name: '魔法女仆', tag: 'mk_magic', roleTag: 'mk_role_magic', dx: -2, dz: -2, main: 'minecraft:netherite_sword', off: '' }
  ]

  function run(s, cmd) { return s.runCommandSilent(cmd) }

  function nameSel(r, dist) {
    return '@e[type=' + MAID + ',name="' + r.name + '",distance=..' + dist + ']'
  }

  function spawnOne(s, p, role) {
    const u = p.username
    const at = 'execute at ' + u + ' positioned ~' + role.dx + ' ~ ~' + role.dz + ' run '
    run(s, at + 'summon ' + MAID + ' ~ ~ ~ {CustomName:\'{"text":"' + role.name + '","color":"light_purple"}\',' +
      'PersistenceRequired:1b,NoAI:0b,Invulnerable:0b,Silent:0b,Health:1000.0f,' +
      'MaidFavorability:1000,Favorability:1000,ModelId:"' + MODEL + '",Tags:["' + role.tag + '","' + role.roleTag + '"]}')

    const sel = '@e[type=' + MAID + ',tag=' + role.tag + ',sort=nearest,limit=1,distance=..4]'
    run(s, at + 'data modify entity ' + sel + ' Owner set from entity ' + u + ' UUID')
    run(s, at + 'data merge entity ' + sel + ' {MaidFavorability:1000,Favorability:1000,Health:1000.0f,' +
      'NoAI:0b,Invulnerable:0b,Silent:0b,' + BAUBLES + '}')

    run(s, at + 'attribute ' + sel + ' minecraft:generic.max_health base set 1000')
    run(s, at + 'attribute ' + sel + ' minecraft:generic.armor base set 30')
    run(s, at + 'attribute ' + sel + ' minecraft:generic.armor_toughness base set 20')
    run(s, at + 'attribute ' + sel + ' minecraft:generic.knockback_resistance base set 1')
    run(s, at + 'attribute ' + sel + ' minecraft:generic.attack_damage base set 80')
    run(s, at + 'attribute ' + sel + ' minecraft:generic.movement_speed base set 0.45')

    EFFECTS.forEach(id => run(s, at + 'effect give ' + sel + ' ' + id + ' infinite 5 true'))

    run(s, 'execute at ' + u + ' run item replace entity ' + sel + ' weapon.mainhand with ' + role.main)
    if (role.off) run(s, 'execute at ' + u + ' run item replace entity ' + sel + ' weapon.offhand with ' + role.off)
    ;['head:helmet', 'chest:chestplate', 'legs:leggings', 'feet:boots'].forEach(pair => {
      const [slot, piece] = pair.split(':')
      run(s, 'execute at ' + u + ' run item replace entity ' + sel + ' armor.' + slot +
        ' with minecraft:netherite_' + piece + '{Enchantments:[{id:"minecraft:protection",lvl:4},{id:"minecraft:unbreaking",lvl:3}]}')
    })
  }

  event.register(Commands.literal('mkarmy').executes(ctx => {
    const p = ctx.source.playerOrException
    const s = p.level.server
    ROLES.forEach(r => {
      run(s, 'execute at ' + p.username + ' run kill @e[type=' + MAID + ',tag=' + r.tag + ',distance=..24]')
      run(s, 'execute at ' + p.username + ' run kill ' + nameSel(r, 24))
    })
    ROLES.forEach(r => spawnOne(s, p, r))
    run(s, 'give ' + p.username + ' tacz:ammo{AmmoId:"tacz:58x42"} 128')
    p.tell(Text.gold('四只女仆已就位：圣女 / 斯塔·柏 / 新春纸板狐 / 魔法女仆'))
    p.tell(Text.gray('饰品 30 格、效果 29 个、下界合金甲、主副手武器都穿好了。子弹在包里。'))
    p.tell(Text.gray('再敲 /mkcheck，会把每只女仆的饰品/武器数据直接打在聊天栏。'))
    return 1
  }))

  // /mkcheck：先按名字补标签，再用可见命令把数据打到玩家聊天栏
  event.register(Commands.literal('mkcheck').executes(ctx => {
    const p = ctx.source.playerOrException
    const s = p.level.server
    const u = p.username
    ROLES.forEach(r => {
      run(s, 'execute as ' + u + ' run tag ' + nameSel(r, 64) + ' add ' + r.tag)
      run(s, 'execute as ' + u + ' run data get entity @e[type=' + MAID + ',tag=' + r.tag + ',limit=1,distance=..64] MaidBaubleInventory.Items')
      run(s, 'execute as ' + u + ' run data get entity @e[type=' + MAID + ',tag=' + r.tag + ',limit=1,distance=..64] HandItems')
      run(s, 'execute as ' + u + ' run data get entity @e[type=' + MAID + ',tag=' + r.tag + ',limit=1,distance=..64] Attributes')
      run(s, 'execute as ' + u + ' run data get entity @e[type=' + MAID + ',tag=' + r.tag + ',limit=1,distance=..64] Owner')
    })
    return 1
  }))
})
