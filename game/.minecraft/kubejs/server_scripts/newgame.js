// /mknew —— 新存档一条龙：别墅 + 四女仆 + 戒指 + 状态
// 用玩家自己的命令源执行，保证 ctx.source.player 不是 null。
ServerEvents.commandRegistry(event => {
  const { commands: Commands } = event

  event.register(Commands.literal('mknew').executes(ctx => {
    const p = ctx.source.player
    if (!p) return 0
    const s = p.level.server

    p.tell(Text.gold('开工：别墅 → 四女仆 → 戒指 → 状态。'))

    const steps = ['mkhome', 'mkarmy', 'mkwife', 'mkstatus']
    steps.forEach(cmd => {
      try {
        s.getCommands().performPrefixedCommand(p.createCommandSourceStack(), cmd)
      } catch (e) {
        p.tell(Text.red('[mk] ' + cmd + ' 失败：' + e))
      }
    })

    p.tell(Text.gold('好了。别墅在脚下，四只女仆在身边，戒指在包里。'))
    p.tell(Text.gray('没看到女仆就单独再敲一次 /mkarmy；法术任务在女仆界面「任务」里切。'))
    1
  }))
})