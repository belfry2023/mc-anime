// /mkspellbook —— 生成一本装满铁魔法全部法术的「超级法术书」
// 用法：/mkspellbook        给玩家一本
//       /mkspellbook maid   给玩家一本，并提示怎么塞给女仆
// 注意：KubeJS 用的 Rhino 对 const/let 很挑剔——同一函数作用域重复声明就报
// "redeclaration of var X"。所以这里全部用 var（var 重复声明是合法的），循环里只赋值。
(function () {
  ServerEvents.commandRegistry(function (event) {
    var Commands = event.commands

    function buildBook(fixedLevel) {
      var clsContainer = Java.loadClass('io.redspace.ironsspellbooks.api.spells.ISpellContainer')
      var clsRegistry = Java.loadClass('io.redspace.ironsspellbooks.api.registry.SpellRegistry')
      var clsArrayList = Java.loadClass('java.util.ArrayList')

      var listRaw = clsRegistry.getEnabledSpells()
      var listCopy = new clsArrayList(listRaw)
      var totalSpells = listCopy.size()

      var bookStack = Item.of('irons_spellbooks:netherite_spell_book', 1)
      var container = clsContainer.create(totalSpells + 5, false, false)
      var containerMut = container.mutableCopy()

      var addedCount = 0
      var oneSpell = null
      var spellLevel = 0
      var idx = 0
      while (idx < totalSpells) {
        oneSpell = listCopy.get(idx)
        try {
          spellLevel = fixedLevel > 0 ? fixedLevel : oneSpell.getMaxLevel()
          if (containerMut.addSpell(oneSpell, spellLevel, false)) addedCount++
        } catch (errAdd) {
          console.warn('[mk] addSpell failed: ' + errAdd)
        }
        idx++
      }
      // ISpellContainerMutable 没有 save()；要用 ISpellContainer.set(stack, container) 写进物品 NBT
      clsContainer.set(bookStack, containerMut.toImmutable())
      return { stack: bookStack, added: addedCount, total: totalSpells }
    }

    event.register(Commands.literal('mkspellbook').executes(function (ctx) {
      var player = ctx.source.playerOrException
      try {
        var result = buildBook(0)
        player.give(result.stack)
        console.info('[mkbook] built added=' + result.added + '/' + result.total)
        player.tell('法术书做好了：装进去 ' + result.added + '/' + result.total + ' 个法术。')
        return 1
      } catch (errBuild) {
        console.error('[mkbook] failed: ' + errBuild)
        player.tell('[mk] 法术书失败：' + errBuild)
        return 0
      }
    }).then(Commands.literal('maid').executes(function (ctx) {
      var player = ctx.source.playerOrException
      try {
        var result2 = buildBook(0)
        player.give(result2.stack)
        console.info('[mkbook-maid] built added=' + result2.added + '/' + result2.total)
        player.tell('书已放进你背包（' + result2.added + ' 个法术）。打开女仆界面把书放到她副手，任务切「法术战斗」。')
        return 1
      } catch (errMaid) {
        console.error('[mkbook-maid] failed: ' + errMaid)
        player.tell('[mk] 失败：' + errMaid)
        return 0
      }
    })))
  })
})()
