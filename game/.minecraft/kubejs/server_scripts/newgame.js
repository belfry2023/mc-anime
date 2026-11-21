// 新世界开局是否自动生成 4 名女仆队员（圣女 / 斯塔·柏 / 新春纸板狐 / 魔法女仆）。
// 改成 true 可恢复开局自动生成；任何时间都可以手动执行 /mkarmy 召唤/补齐这 4 名队员。
var MK_AUTO_SQUAD = false

// 新世界开局是否自动建造房屋（调 /mkhome 那套别墅/手工房子）。
// 改成 true 可恢复开局自动建房；任何时间都可以在空地上手动执行 /mkhome。
var MK_AUTO_HOME = false

// A server may tick for hours before the first real player joins a new world.
ServerEvents.loaded(e => {
  var d = e.server.persistentData
  if (!d.contains('mkNewRosterWorld')) d.putBoolean('mkNewRosterWorld', e.server.overworld().getTime() <= 1)
})
PlayerEvents.loggedIn(e => {
  var p = e.player,
    d = e.server.persistentData
  if (!d.getBoolean('mkNewRosterWorld')) return
  if (MK_AUTO_HOME && !d.getBoolean('mkBuiltStarterHome') && p.level.isOverworld()) {
    if (global.mkBuildHome(e.server, p)) d.putBoolean('mkBuiltStarterHome', true)
  }
  if (MK_AUTO_SQUAD) global.mkSquad.ensure(p)
})
ServerEvents.commandRegistry(e =>
  e.register(
    e.commands.literal('mknew').executes(c => {
      var p = c.source.playerOrException
      if (!p.persistentData.contains('mk_home') && !global.mkBuildHome(p.server, p)) return 0
      if (MK_AUTO_SQUAD && !global.mkSquad.ensure(p)) return 0
      if (!p.persistentData.contains('mkStarterRings')) {
        p.give(Item.of('maidmarriage:proposal_ring', 2))
        p.persistentData.putBoolean('mkStarterRings', true)
      }
      global.mkBrief(p)
      return 1
    })
  )
)
