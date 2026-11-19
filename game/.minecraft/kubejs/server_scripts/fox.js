// /mkfox —— 直接把「星之魔女的认可」写进玩家 ForgeData（WinefoxChallengeProgress 读的就是这里）
ServerEvents.commandRegistry(event => {
  const { commands: Commands } = event

  event.register(Commands.literal('mkfox').executes(ctx => {
    const player = ctx.source.player
    if (!player) return 0

    // WinefoxChallengeProgress.getWins / hasSoloWin 读的就是这两个键
    const data = player.getPersistentData()
    data.putInt('MaidSpellWinefoxWins', 2)
    data.putBoolean('MaidSpellWinefoxSoloWin', true)
    data.putBoolean('MaidSpellWinefoxDefeated', true)

    const wins = data.getInt('MaidSpellWinefoxWins')
    const solo = data.getBoolean('MaidSpellWinefoxSoloWin')

    player.tell(Text.of('§d[mk] 认可写入：' + wins + '/2，单挑=' + solo))

    player.give(Item.of('touhou_little_maid_spell:returning_star', 1))
    player.tell(Text.of('§b[mk] 归星给你了：拿在手上右键她，看看她认不认。'))

    return 1
  }))
})
