// ============================================================
// /mkboss —— 灾变（Cataclysm）BOSS 结构雷达
// ------------------------------------------------------------
// 用法：
//   /mkboss        六大 BOSS 结构各扫一次（利维坦/焰魔/咒翼灵骸/远古遗魂/末影守卫/斯库拉）
//   /mkboss all    再加上全部小结构（冰封尖塔、废弃神殿、灵魂锻炉、远古工厂、紫水晶巢等）
//
// 原理：用原版的 locate 指令，把命令行输入方设成玩家本人，
//       所以定位结果会直接显示在你的聊天栏里（距离 + 坐标）。
// ============================================================

var MK_BOSS_MAJOR = [
  ['利维坦 · 沉没之城', 'cataclysm:sunken_city'],
  ['焰魔 · 燃烧竞技场', 'cataclysm:burning_arena'],
  ['咒翼灵骸 · 冰封监狱', 'cataclysm:frosted_prison'],
  ['远古遗魂 · 诅咒金字塔', 'cataclysm:cursed_pyramid'],
  ['末影守卫 · 废墟堡垒', 'cataclysm:ruined_citadel'],
  ['斯库拉 · 卫城', 'cataclysm:acropolis']
]

var MK_BOSS_MINOR = [
  ['冰封尖塔', 'cataclysm:abandoned_spire'],
  ['废弃神殿', 'cataclysm:abandoned_temple'],
  ['废弃村庄', 'cataclysm:abandoned_village'],
  ['灵魂锻炉', 'cataclysm:soul_black_smith'],
  ['远古工厂', 'cataclysm:ancient_factory'],
  ['紫水晶巢（紫水晶巨蟹）', 'cataclysm:amethyst_nest'],
  ['沙漠遗址（骸龙）', 'cataclysm:desert_site']
]

// 用玩家自己的指令源跑一条 locate，让结果直接进聊天栏
function mkBossLocate(player, structureId) {
  var cmd = 'locate structure ' + structureId
  // 方案一：拿玩家实体自己的 CommandSourceStack，走 performPrefixedCommand
  try {
    var source = player.minecraftEntity.createCommandSourceStack()
    player.server.commands.performPrefixedCommand(source, cmd)
    return true
  } catch (err1) {
    // 方案二：退回到以玩家身份执行（部分版本 execute as 会静默）
    try {
      player.server.runCommandSilent(
        'execute as ' + player.username + ' at @s run ' + cmd
      )
      return true
    } catch (err2) {
      console.info('[MKBOSS] locate 失败 ' + structureId + ': ' + err1 + ' / ' + err2)
      return false
    }
  }
}

function mkBossRun(player, list) {
  player.tell('§b[MK] 灾变 BOSS 雷达：正在扫描 ' + list.length + ' 个结构…')
  var failed = []
  list.forEach(function (entry) {
    player.tell('§7── §e' + entry[0] + ' §8(' + entry[1] + ')')
    if (!mkBossLocate(player, entry[1])) {
      failed.push(entry[1])
    }
  })
  if (failed.length > 0) {
    player.tell(
      '§c[MK] 有 ' + failed.length + ' 个结构没扫到（可能是周围没有对应群系，或直接手敲 /locate structure ' +
        failed[0] +
        '）'
    )
  } else {
    player.tell('§a[MK] 扫描完成。想再去一遍就再输一次 /mkboss。')
  }
}

ServerEvents.commandRegistry(function (ev) {
  var commands = ev.commands
  var L = commands.literal

  ev.register(
    L('mkboss')
      .executes(function (c) {
        var p = c.source.playerOrException
        mkBossRun(p, MK_BOSS_MAJOR)
        p.tell('§8提示：/mkboss all 连小结构一起扫；/locate structure <id> 可单独查')
        return 1
      })
      .then(
        L('all').executes(function (c) {
          var p = c.source.playerOrException
          mkBossRun(p, MK_BOSS_MAJOR.concat(MK_BOSS_MINOR))
          return 1
        })
      )
  )
})
