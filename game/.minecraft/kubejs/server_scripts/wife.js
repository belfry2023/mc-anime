ServerEvents.commandRegistry(e => {
  e.register(
    e.commands.literal('mkwife').executes(c => {
      var p = c.source.playerOrException
      p.give(Item.of('maidmarriage:proposal_ring', 2))
      p.level.getEntitiesWithin(p.boundingBox.inflate(16)).forEach(m => {
        if (global.mkSquad.ownerOf(m) === String(p.uuid)) global.mkSquad.maxBond(m)
      })
      p.tell('§d附近自己的女仆已恢复满羁绊。主副手各持一枚戒指，右键求婚。')
      return 1
    })
  )
})
