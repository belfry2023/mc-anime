// 女仆调度器：手里拿个钟右键一下，就把热键栏第 1/2/3 格分给女仆。
// 不再需要敲命令；/mkslot 保留作备用。

function doAssign(p, s) {
  const name = p.username
  const at = `execute at ${name} run `

  const pairs = [['圣女', 'mk_saint'], ['斯塔·柏', 'mk_star'], ['新春纸板狐', 'mk_fox'], ['魔法女仆', 'mk_magic']]
  pairs.forEach(([n, t]) => {
    s.runCommandSilent(`${at}tag @e[type=touhou_little_maid:maid,name="${n}",distance=..64] add ${t}`)
  })

  const star = `@e[tag=mk_star,sort=nearest,limit=1,distance=..64]`
  const magic = `@e[tag=mk_magic,sort=nearest,limit=1,distance=..64]`
  const saint = `@e[tag=mk_saint,sort=nearest,limit=1,distance=..64]`

  const gunOk = s.runCommandSilent(`item replace entity ${star} weapon.mainhand from entity ${name} hotbar.0`)
  let ammoOk = s.runCommandSilent(`item replace entity ${star} container.0 from entity ${name} hotbar.1`)
  if (ammoOk <= 0) ammoOk = s.runCommandSilent(`item replace entity ${star} container.1 from entity ${name} hotbar.1`)

  const katOk = s.runCommandSilent(`item replace entity ${magic} weapon.mainhand from entity ${name} hotbar.2`)

  const enchants = [
    ['minecraft:sharpness', 255],
    ['minecraft:smite', 255],
    ['minecraft:fire_aspect', 255],
    ['minecraft:looting', 255],
    ['minecraft:knockback', 255],
    ['minecraft:unbreaking', 255],
  ]
  let enchOk = 0
  enchants.forEach(([id, lv]) => {
    if (s.runCommandSilent(`enchant ${magic} ${id} ${lv}`) > 0) enchOk++
  })

  s.runCommandSilent(`item replace entity ${saint} weapon.offhand with irons_spellbooks:staff_of_the_nines`)

  p.tell(`调度完成：枪 ${gunOk > 0 ? '✓' : '✗'} / 弹 ${ammoOk > 0 ? '✓' : '✗'} / 太刀 ${katOk > 0 ? '✓' : '✗'} / 附魔 ${enchOk} 条`)
  p.tell('拿钟右键就是一键换装；想再换一次，把东西重新摆到前三格再右键。')
}

ItemEvents.rightClicked('minecraft:clock', event => {
  const p = event.player
  if (!p) return
  doAssign(p, p.server)
})

ServerEvents.commandRegistry(event => {
  const { commands: Commands } = event
  event.register(Commands.literal('mkslot').executes(ctx => {
    const p = ctx.source.player
    if (!p) return 0
    doAssign(p, p.server)
    return 1
  }))
})
