// domain.js v2 —— 「旧日魔王的女仆军团」领域/术式（KubeJS 近似实现）
// 赋职：/mkdomain saint | star | fox | magic
// 领域：/mkdomain cast
// （术式 cang/he/zi 已移除，等能在本地跑通再加回）
// 状态：/mkdomain status
// 解除熔断：/mkdomain unbind（斯塔被动，每天 3 次）
const MK_BURN = {}

ServerEvents.commandRegistry(event => {
  const { commands: Commands } = event

  const ROLES = {
    saint: { sel: 'name=圣女', tag: 'mk_role_saint', name: '圣女·伏魔御厨子', radius: 12, burn: 120, bossDmg: 100, cd: '短' },
    star: { sel: 'name=斯塔·柏', tag: 'mk_role_star', name: '斯塔·柏·无量空处', radius: 16, burn: 220, bossDmg: 180, cd: '长' },
    fox: { sel: 'name=新春纸板狐', tag: 'mk_role_fox', name: '新春纸板狐·共享视野', radius: 26, burn: 80, bossDmg: 30, cd: '中' },
    magic: { sel: 'name=魔法女仆', tag: 'mk_role_magic', name: '魔法女仆·天与咒缚', radius: 10, burn: 100, bossDmg: 60, cd: '中' }
  }

  const ROLE_MATCH = { saint: '圣女', star: '斯塔', fox: '纸板狐', magic: '魔法女仆' }

  // 不碰 JS 实体 API：用命令判断「附近有没有女仆」
  const maidNear = (player, dist) =>
    player.level.server.runCommandSilent(
      'execute at ' + player.username + ' run execute if entity @e[type=touhou_little_maid:maid,distance=..' + (dist || 16) + ']'
    ) === 1

  const has = (player, role, dist) => maidNear(player, dist || 16)

  const isBurning = (player, role) => (MK_BURN[player.username + ':' + role] || 0) > Date.now()

  const run = (player, cmd) => player.level.server.runCommandSilent(cmd.replace(/%p/g, player.username))

  function ring(server, p, r, particle, n) {
    const s = r.toFixed(1)
    server.runCommandSilent(`execute at ${p.username} run particle minecraft:${particle} ~ ~0.3 ~ ${s} ${s} ${s} 0.02 ${n} force`)
  }

  // —— 领域 ——
  function castDomain(player, role) {
    const server = player.level.server
    const c = ROLES[role]
    const u = player.username
    // 视觉/音效
    ring(server, player, c.radius * 0.5, 'soul_fire_flame', 48)
    ring(server, player, c.radius, 'end_rod', 64)
    run(player, `playsound minecraft:entity.warden.sonic_boom player ${u} ~ ~ ~ 1 0.5`)
    run(player, `execute at ${u} run particle minecraft:flash ~ ~1 ~ 0 0 0 0 3 force`)
    run(player, `title ${u} subtitle {"text":"${c.name}","color":"dark_purple"}`)
    run(player, `title ${u} title {"text":"领域展开","color":"light_purple","bold":true}`)

    // 清杂兵（不动 boss 标签）
    ;['#minecraft:raiders', 'minecraft:zombie', 'minecraft:skeleton', 'minecraft:spider', 'minecraft:creeper', 'minecraft:witch', 'minecraft:phantom']
      .forEach(t => run(player, `execute at ${u} run kill @e[type=${t},distance=..${c.radius},tag=!mk_boss,tag=!mk_lair]`))

    // boss 伤害
    ;['cataclysm:the_harbinger', 'minecraft:wither', 'minecraft:ender_dragon', 'minecraft:ravager']
      .forEach(t => run(player, `execute at ${u} run damage @e[type=${t},distance=..${c.radius}] ${c.bossDmg} minecraft:magic`))

    if (role === 'star') {
      run(player, `execute at ${u} run effect give @e[type=cataclysm:the_harbinger,distance=..${c.radius}] minecraft:slowness 180 200 true`)
      run(player, `execute at ${u} run effect give @e[type=minecraft:wither,distance=..${c.radius}] minecraft:slowness 180 200 true`)
      run(player, `execute at ${u} run effect give @e[type=minecraft:ravager,distance=..${c.radius}] minecraft:slowness 180 200 true`)
    }
    if (role === 'magic') {
      run(player, `execute at ${u} run effect give @e[type=touhou_little_maid:maid,tag=mk_role_magic,distance=..12] minecraft:speed 200 2 true`)
      run(player, `execute at ${u} run effect give @e[type=touhou_little_maid:maid,tag=mk_role_magic,distance=..12] minecraft:strength 200 3 true`)
    }
    if (role === 'saint') {
      // 魔虚罗（大只、续航）+ 融合怪（小只、铺场）
      run(player, `execute at ${u} run summon minecraft:iron_golem ^3 ^ ^3 {CustomName:'{"text":"魔虚罗","color":"dark_red"}',PersistenceRequired:1b,Tags:["mk_shikigami"]}`)
      run(player, `execute at ${u} run summon minecraft:zombie ^-3 ^ ^3 {CustomName:'{"text":"融合怪","color":"red"}',PersistenceRequired:1b,Health:40.0f,Tags:["mk_shikigami"]}`)
      run(player, `execute at ${u} run effect give @e[type=minecraft:iron_golem,tag=mk_shikigami] minecraft:regeneration 600 2 true`)
      run(player, `execute at ${u} run effect give @e[type=minecraft:zombie,tag=mk_shikigami] minecraft:regeneration 600 1 true`)
    }

    // 熔断
    run(player, `execute at ${u} run effect give @e[type=touhou_little_maid:maid,distance=..${c.radius}] minecraft:weakness ${c.burn} 1 true`)
    run(player, `execute at ${u} run effect give @e[type=touhou_little_maid:maid,distance=..${c.radius}] minecraft:slowness ${c.burn} 1 true`)
    MK_BURN[u + ':' + role] = Date.now() + c.burn * 50
    player.tell(Text.of(`【${c.name}】展开。术式熔断 ${(c.burn / 20) | 0} 秒（冷却${c.cd}）。`))
  }

  event.register(Commands.literal('mkdomain')
    .then(Commands.literal('saint').executes(ctx => { assign(ctx.source.playerOrException, 'saint'); return 1 }))
    .then(Commands.literal('star').executes(ctx => { assign(ctx.source.playerOrException, 'star'); return 1 }))
    .then(Commands.literal('fox').executes(ctx => { assign(ctx.source.playerOrException, 'fox'); return 1 }))
    .then(Commands.literal('magic').executes(ctx => { assign(ctx.source.playerOrException, 'magic'); return 1 }))
    .then(Commands.literal('cast').executes(ctx => {
      const player = ctx.source.playerOrException
      for (const r of ['star', 'saint', 'magic', 'fox']) {
        if (!has(player, r)) continue
        if (isBurning(player, r)) { player.tell(Text.of(`${ROLES[r].name} 正在术式熔断，放不出来。`)); return 0 }
        castDomain(player, r)
        return 1
      }
      player.tell(Text.of('身边 16 格内没有带职阶的女仆，先 /mkdomain saint|star|fox|magic。'))
      return 0
    }))

    .then(Commands.literal('status').executes(ctx => {
      const player = ctx.source.playerOrException
      for (const r in ROLES) {
        if (has(player, r)) player.tell(Text.of(`身边有：${ROLES[r].name}${isBurning(player, r) ? '（熔断中）' : ''}`))
      }
      return 1
    }))
    .then(Commands.literal('unbind').executes(ctx => {
      const player = ctx.source.playerOrException
      const data = player.persistentData
      const day = Math.floor(player.level.dayTime / 24000)
      if (data.getInt('mk_unbind_day') !== day) { data.putInt('mk_unbind_day', day); data.putInt('mk_unbind_used', 0) }
      const used = data.getInt('mk_unbind_used')
      if (used >= 3) { player.tell(Text.of('今天的 3 次已经用完了。')); return 0 }
      data.putInt('mk_unbind_used', used + 1)
      run(player, `execute at ${player.username} run effect clear @e[type=touhou_little_maid:maid,tag=mk_role_star,distance=..20] minecraft:weakness`)
      run(player, `execute at ${player.username} run effect clear @e[type=touhou_little_maid:maid,tag=mk_role_star,distance=..20] minecraft:slowness`)
      player.tell(Text.of(`解除了熔断（今天第 ${used + 1}/3 次）。`))
      return 1
    }))
  )

  function ensureTag(player, role) {
    const u = player.username
    const near = player.level.server.runCommandSilent(
      `execute at ${u} run execute if entity @e[type=touhou_little_maid:maid]`
    ) === 1
    if (!near) return false
    run(player, `execute at ${u} run tag @e[type=touhou_little_maid:maid,sort=nearest,limit=1] add ${ROLES[role].tag}`)
    return true
  }

  function assign(player, role) {
    for (const r in ROLES) run(player, `execute at ${player.username} run tag @e[type=touhou_little_maid:maid,tag=${ROLES[r].tag},distance=..32] remove ${ROLES[r].tag}`)
    if (!ensureTag(player, role)) {
      player.tell(Text.of(`你身边 32 格内没有女仆，先把人放在身边再赋职。`))
      return
    }
    player.tell(Text.of(`她是「${ROLES[role].name}」了。`))
  }
})

// —— 持续被动 ——
ServerEvents.tick(event => {
  if (event.server.tickCount % 100 !== 0) return
  const s = event.server
  s.players.forEach(p => {
    const u = p.username
    // 纸板狐：共享视野（给敌对生物发光）
    if (s.runCommandSilent(`execute at ${u} run execute if entity @e[type=touhou_little_maid:maid,tag=mk_role_fox,distance=..26]`) === 1) {
      s.runCommandSilent(`execute at ${u} run effect give @e[type=!minecraft:player,type=!minecraft:item,type=!minecraft:item_frame,type=!minecraft:armor_stand,type=!touhou_little_maid:maid,distance=..40] minecraft:glowing 6 0 true`)
      // 10% 伤害复制：每 5 秒对最近敌人补一小口
      s.runCommandSilent(`execute at ${u} run damage @e[type=#minecraft:raiders,sort=nearest,limit=1,distance=..30] 3 minecraft:magic`)
    }
    // 魔法女仆：天与咒缚（抗性+速度+力量），血量超厚在赋职时另给
    if (s.runCommandSilent(`execute at ${u} run execute if entity @e[type=touhou_little_maid:maid,tag=mk_role_magic,distance=..20]`) === 1) {
      s.runCommandSilent(`execute at ${u} run effect give @e[type=touhou_little_maid:maid,tag=mk_role_magic,distance=..20] minecraft:resistance 8 2 true`)
      s.runCommandSilent(`execute at ${u} run effect give @e[type=touhou_little_maid:maid,tag=mk_role_magic,distance=..20] minecraft:speed 8 2 true`)
      s.runCommandSilent(`execute at ${u} run effect give @e[type=touhou_little_maid:maid,tag=mk_role_magic,distance=..20] minecraft:strength 8 2 true`)
    }
    // 圣女：远程「解」——每 5 秒对 16 格内最近敌人斩一下
    if (s.runCommandSilent(`execute at ${u} run execute if entity @e[type=touhou_little_maid:maid,tag=mk_role_saint,distance=..20]`) === 1) {
      s.runCommandSilent(`execute at ${u} run damage @e[type=#minecraft:raiders,sort=nearest,limit=1,distance=..16] 8 minecraft:magic`)
      s.runCommandSilent(`execute at ${u} run particle minecraft:sweep_attack ~ ~1 ~ 0.3 0.3 0.3 0 1 force`)
    }
    // 斯塔：非熔断期免物伤
    if (s.runCommandSilent(`execute at ${u} run execute if entity @e[type=touhou_little_maid:maid,tag=mk_role_star,distance=..20,tag=!mk_burning]`) === 1) {
      s.runCommandSilent(`execute at ${u} run effect give @e[type=touhou_little_maid:maid,tag=mk_role_star,distance=..20] minecraft:resistance 8 3 true`)
    }
  })
})
