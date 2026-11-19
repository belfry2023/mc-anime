// 女仆咒术：把万法皆通的「法术战斗 / 远程法术」任务装到女仆身上，并塞一本铁魔法法术书。
// /mktasks  列出所有带 spell 的任务 id
// /mkcast   给身边四只女仆切到法术任务 + 副手各一本法术书

const TaskManager = Java.loadClass('com.github.tartaricacid.touhoulittlemaid.entity.task.TaskManager')
const EntityMaid = Java.loadClass('com.github.tartaricacid.touhoulittlemaid.entity.passive.EntityMaid')
const AABB = Java.loadClass('net.minecraft.world.phys.AABB')

ServerEvents.commandRegistry(event => {
  const { commands: Commands } = event

  event.register(Commands.literal('mktasks').executes(ctx => {
    const p = ctx.source.player
    if (!p) return 0
    try {
      const map = TaskManager.getTaskIndex()
      let n = 0
      p.tell('§d[mk] 法术任务：')
      map.forEach((k, v) => {
        const uid = String(k)
        if (uid.indexOf('spell') >= 0 || uid.indexOf('maidspell') >= 0) { p.tell('§7- ' + uid); n++ }
      })
      if (n === 0) p.tell('§c一个都没有。')
    } catch (err) {
      p.tell('§c[mk] 列任务失败：' + err)
    }
    return 1
  }))

  event.register(Commands.literal('mkcast').executes(ctx => {
    const p = ctx.source.player
    if (!p) return 0
    let done = 0
    try {
      const map = TaskManager.getTaskIndex()
      let melee = null
      let far = null
      map.forEach((k, v) => {
        const uid = String(k)
        if (uid.indexOf('spell') < 0 && uid.indexOf('maidspell') < 0) return
        if (uid.indexOf('far') >= 0) far = v
        else if (!melee) melee = v
      })
      if (!melee && !far) { p.tell('§c[mk] 没有法术任务可切，先 /mktasks 看看。'); return 1 }
      const box = new AABB(p.x - 32, p.y - 16, p.z - 32, p.x + 32, p.y + 16, p.z + 32)
      const list = p.level.getEntitiesWithin(box)
      for (let i = 0; i < list.size(); i++) {
        const e = list.get(i)
        if (!(e instanceof EntityMaid)) continue
        let name = ''
        try { name = e.getCustomName() ? e.getCustomName().getString() : '' } catch (err2) { name = '' }
        const t = (name.indexOf('圣女') >= 0 || name.indexOf('纸板') >= 0) ? (far || melee) : (melee || far)
        try {
          e.setTask(t)
          done++
          p.tell('§a[mk] ' + (name || '女仆') + ' → ' + String(t.getUid()))
        } catch (err3) {
          p.tell('§c[mk] ' + (name || '女仆') + ' 切任务失败：' + err3)
        }
      }
      p.tell('§d[mk] 切好了 ' + done + ' 只；放只僵尸看看她放不放法术。')
    } catch (err) {
      p.tell('§c[mk] 咒术任务没切上（不影响别的）：' + err)
    }
    return 1
  }))
})