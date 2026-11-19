// 找女仆 / 拉女仆：/mkfind 打印已加载女仆坐标，/mkgrab 把能叫到的女仆全拉到身边
ServerEvents.commandRegistry(event => {
  const { commands: Commands } = event

  event.register(Commands.literal('mkfind').executes(ctx => {
    const p = ctx.source.player
    const s = ctx.source.server
    if (!p) return 0
    s.runCommandSilent('execute as @e[type=touhou_little_maid:maid] run data get entity @s Pos')
    s.runCommandSilent('execute as @e[type=touhou_little_maid:maid] run data get entity @s CustomName')
    p.tell('§e上面是当前世界里【已加载】的女仆坐标。没列出来的就是所在区块还没加载。')
    return 1
  }))

  event.register(Commands.literal('mkgrab').executes(ctx => {
    const p = ctx.source.player
    const s = ctx.source.server
    if (!p) return 0
    s.runCommandSilent('execute at ' + p.username + ' run tp @e[type=touhou_little_maid:maid] ~ ~ ~')
    p.tell('§d能叫到的女仆都拉到脚边了。再看看契约武器能不能按 ] 召回。')
    return 1
  }))
})