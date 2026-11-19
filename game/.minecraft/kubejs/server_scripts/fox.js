// Update through the installed Spell version, including the per-player client tooltip cache.
ServerEvents.commandRegistry(e => {
  e.register(
    e.commands.literal('mkfox').executes(c => {
      try {
        var p = c.source.playerOrException
        var progress = Java.loadClass('com.github.yimeng261.maidspell.winefox.WinefoxChallengeProgress')
        var vow = Java.loadClass('com.github.yimeng261.maidspell.winefox.WinefoxVowProgress')
        var sync = Java.loadClass('com.github.yimeng261.maidspell.event.WinefoxProgressSyncEvents')
        progress.setProgress(p, Math.max(progress.getWins(p), vow.REQUIRED_WINS), true)
        progress.markDefeated(p)
        sync.sync(p)
        if (!vow.isReady(p)) {
          p.tell('§c酒狐尚未认可，请查看服务端日志。')
          return 0
        }
        var star = Item.of('touhou_little_maid_spell:returning_star')
        if (!p.inventory.contains(star)) p.give(star)
        p.tell('§d星之魔女已认可你。手持归星，对未缔约、已结束战斗的星之魔女本体连续交互两次，领取魂符。')
        return 1
      } catch (err) {
        console.error('[mkfox] ' + err)
        c.source.sendFailure(Text.of('酒狐进度更新失败：' + err))
        return 0
      }
    })
  )
})
