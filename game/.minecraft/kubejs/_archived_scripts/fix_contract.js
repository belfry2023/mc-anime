// 补救：给人一把契约之刃 + 重新缔结用
ServerEvents.commandRegistry(event => {
  const { commands: Commands } = event

  event.register(Commands.literal('mkcontract').executes(ctx => {
    const p = ctx.source.player
    if (!p) return 0
    const s = ctx.source.server
    s.runCommandSilent('give ' + p.username + ' maid_weapon:maid_sword 1')
    s.runCommandSilent('give ' + p.username + ' maid_weapon:spirit_crystal 4')
    p.tell('§d契约之刃给你了。主手持刀，右键她一下，重新缔结。')
    return 1
  }))

  // 重新绑定：把最近的、属于自己的女仆认回来（只改 Owner，不动别的）
  event.register(Commands.literal('mkclaim').executes(ctx => {
    const p = ctx.source.player
    if (!p) return 0
    const s = ctx.source.server
    s.runCommandSilent('execute at ' + p.username + ' run data modify entity @e[type=touhou_little_maid:maid,sort=nearest,limit=1,distance=..8] Owner set from entity ' + p.username + ' UUID')
    s.runCommandSilent('execute at ' + p.username + ' run data modify entity @e[type=touhou_little_maid:maid,sort=nearest,limit=1,distance=..8] MaidFavorability set value 384')
    p.tell('§d这只现在归你了。')
    return 1
  }))
})
