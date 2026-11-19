// /mkwife —— 一键：两枚求婚戒指 + 身边女仆好感/情绪拉满 + 重刷性格
ServerEvents.commandRegistry(event => {
  const { commands: Commands } = event

  const run = (server, cmd) => { try { return server.runCommandSilent(cmd) } catch (e) { return 0 } }

  event.register(
    Commands.literal('mkwife').executes(ctx => {
      const p = ctx.source.player
      const s = ctx.source.server
      if (!p) return 0

      run(s, `give ${p.username} maidmarriage:proposal_ring 2`)

      const box = p.boundingBox.inflate(16)
      const maids = p.level.getEntitiesWithin(box).filter(e => String(e.type).indexOf('touhou_little_maid') === 0)
      maids.forEach(m => {
        try {
          // TLM 原版好感
          run(s, `execute as ${m.uuid} run data merge entity @s {MaidFavorability:384,Favorability:384}`)
          // Affection 模组数值：亲近/情绪/忠诚/执念 拉满
          run(s, `execute as ${m.uuid} run data merge entity @s {Closeness:100,Emotion:100,Loyalty:100,Obsession:100,Resentment:0}`)
          run(s, `execute as ${m.uuid} run data merge entity @s {Affection:100,LoyaltyLevel:35}`)
        } catch (e) {}
      })

      p.tell(Text.of(`戒指给你了。身边 ${maids.length} 只女仆的好感拉满，情绪值也一并写进去了。`).color('light_purple'))
      p.tell(Text.of('主手/副手各拿一枚，右键她就能求婚。性格要换的话，拿性格编辑器右键她重选。').color('gray'))
      1
    })
  )
})