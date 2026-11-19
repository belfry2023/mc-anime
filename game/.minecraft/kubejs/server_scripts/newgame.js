// A server may tick for hours before the first real player joins a new world.
ServerEvents.loaded(e => {
  var d = e.server.persistentData
  if (!d.contains('mkNewRosterWorld')) d.putBoolean('mkNewRosterWorld', e.server.overworld().getTime() <= 1)
})
PlayerEvents.loggedIn(e => {
  var p = e.player,
    d = e.server.persistentData
  if (!d.getBoolean('mkNewRosterWorld')) return
  if (!d.getBoolean('mkBuiltStarterHome') && p.level.isOverworld()) {
    if (global.mkBuildHome(e.server, p)) d.putBoolean('mkBuiltStarterHome', true)
  }
  global.mkSquad.ensure(p)
})
ServerEvents.commandRegistry(e =>
  e.register(
    e.commands.literal('mknew').executes(c => {
      var p = c.source.playerOrException
      if (!p.persistentData.contains('mk_home') && !global.mkBuildHome(p.server, p)) return 0
      if (!global.mkSquad.ensure(p)) return 0
      if (!p.persistentData.contains('mkStarterRings')) {
        p.give(Item.of('maidmarriage:proposal_ring', 2))
        p.persistentData.putBoolean('mkStarterRings', true)
      }
      global.mkBrief(p)
      return 1
    })
  )
)
