// 找回绑定的女仆：/mkmaid 在她倒下的地方重新召唤一只「魔法酒狐」，绑定到你名下
ServerEvents.commandRegistry(event => {
  const { commands: Commands } = event
  event.register(Commands.literal('mkmaid').executes(ctx => {
    const p = ctx.source.player
    if (!p) return 0
    const s = ctx.source.server
    s.runCommandSilent('execute at ' + p.username + ' run summon touhou_little_maid:maid ~ ~ ~ {CustomName:\'{"text":"魔法酒狐","color":"light_purple"}\',ModelId:"touhou_little_maid_spell:stellar_witch",SoundPackId:"touhou_little_maid:default",MaidFavorability:384,Favorability:384,NoAI:0b,Invulnerable:0b,Silent:0b,Health:300.0f,PersistenceRequired:1b,Tags:["mk_maid_back"]}')
    s.runCommandSilent('execute at ' + p.username + ' run data modify entity @e[type=touhou_little_maid:maid,tag=mk_maid_back,sort=nearest,limit=1] Owner set from entity ' + p.username + ' UUID')
    s.runCommandSilent('execute at ' + p.username + ' run tag @e[type=touhou_little_maid:maid,tag=mk_maid_back,sort=nearest,limit=1] remove mk_maid_back')
    s.runCommandSilent('execute at ' + p.username + ' run attribute @e[type=touhou_little_maid:maid,sort=nearest,limit=1,distance=..6] minecraft:generic.max_health base set 300')
    p.tell('§d她回来了——「……你找了我多久？」')
    return 1
  }))
})