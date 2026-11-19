// One companion, two representations. Keep both mods' inventories and AI data in their native NBT.
;(function () {
  var squad = global.mkSquad,
    maid = 'touhou_little_maid:maid',
    original = 'sexmod:jenny'
  var Tasks = Java.loadClass('com.github.tartaricacid.touhoulittlemaid.entity.task.TaskManager')
  var Registry = Java.loadClass('net.minecraftforge.registries.ForgeRegistries')
  function locate(p, r) {
    var e = squad.lookup(p.level, r.getString('jenny'))
    return e && e.isAlive() && String(e.persistentData.getString('mkJennyOwner')) === String(p.uuid) ? e : null
  }
  function putAt(p, e, near) {
    var spot = squad.safeSpot(e, near, 2)
    if (!spot) return false
    e.setPos(spot[0], spot[1], spot[2])
    return true
  }
  function applyCompanionModel(m) {
    var packs = Java.loadClass('com.github.tartaricacid.touhoulittlemaid.entity.info.ServerCustomPackLoader')
    if (
      packs.SERVER_MAID_MODELS.getInfo('mk_jenny:jenny').isPresent() &&
      String(m.getModelId()) === 'touhou_little_maid:hakurei_reimu'
    )
      m.setModelId('mk_jenny:jenny')
  }
  function makeMaid(p) {
    var m = p.level.createEntity(maid)
    m.tame(p)
    applyCompanionModel(m)
    m.setCustomName(Text.of('珍妮'))
    m.setPersistenceRequired()
    m.setTask(Tasks.findTask('touhou_little_maid:attack').orElseThrow())
    m.setMainHandItem(Item.of('minecraft:iron_sword'))
    m.setOffHandItem(Item.of('minecraft:bow'))
    m.getAvailableInv(false).insertItem(0, Item.of('minecraft:arrow', 64), false)
    return m
  }
  function command(p, action) {
    var r = squad.roster(p),
      cur = locate(p, r)
    if (action === 'recruit') {
      if (r.contains('jenny')) {
        p.tell(cur ? '珍妮已经在队。' : '珍妮已经登记，请到她所在的维度、加载她的区块，或用原魂符复活。')
        return cur ? 1 : 0
      }
      var newcomer = makeMaid(p)
      newcomer.persistentData.putString('mkJennyOwner', String(p.uuid))
      if (!putAt(p, newcomer, p) || !p.level.addFreshEntity(newcomer)) return 0
      r.putString('jenny', String(newcomer.uuid))
      p.tell('§a珍妮加入。右键可打开女仆装备与任务，在营地使用 /mkjenny sethome。')
      return 1
    }
    if (!cur || cur.distanceToEntity(p) > 64) {
      p.tell('自己的珍妮需在本维度 64 格内。')
      return 0
    }
    var isMaid = String(cur.type) === maid
    if (action === 'original' || action === 'maid') {
      var intoMaid = action === 'maid'
      if (isMaid === intoMaid) {
        if (intoMaid) applyCompanionModel(cur)
        p.tell('珍妮已经处于该形态。')
        return 1
      }
      if (!intoMaid && !Registry.ENTITY_TYPES.containsKey(original)) {
        p.tell('§e原角色形态需要 JennySP 1.20.1 Forge。当前可使用全部女仆同伴指令。')
        return 0
      }
      if (cur.isPassenger() || cur.isVehicle()) {
        p.tell('请先结束乘坐或交互，再切换形态。')
        return 0
      }
      var oldKey = isMaid ? 'mkJennyMaid' : 'mkJennyOriginal',
        nextKey = intoMaid ? 'mkJennyMaid' : 'mkJennyOriginal'
      var next = p.level.createEntity(intoMaid ? maid : original)
      if (r.contains(nextKey)) next.setNbt(r.getCompound(nextKey).copy())
      else if (intoMaid) next = makeMaid(p)
      if (intoMaid) applyCompanionModel(next)
      next.setCustomName(Text.of('珍妮'))
      next.setPersistenceRequired()
      next.persistentData.putString('mkJennyOwner', String(p.uuid))
      next.setPos(cur.getX(), cur.getY(), cur.getZ())
      var snapshot = cur.nbt
      if (!p.level.addFreshEntity(next)) {
        p.tell('当前形态无法生成，珍妮仍在原地。')
        return 0
      }
      r.put(oldKey, snapshot)
      r.putString('jenny', String(next.uuid))
      r.remove(nextKey)
      cur.discard()
      p.tell(intoMaid ? '§a珍妮已回到女仆系统。' : '§a珍妮已切换到 JennySP 原角色。右键使用原模组菜单。')
      return 1
    }
    if (!isMaid) {
      p.tell('请用原角色菜单，或 /mkjenny maid 切回女仆。')
      return 0
    }
    if (action === 'sethome') {
      r.putString('jennyDim', String(cur.level.dimension))
      r.putDouble('jennyX', cur.x)
      r.putDouble('jennyY', cur.y)
      r.putDouble('jennyZ', cur.z)
      global.mkQuestMark(p, 'jenny')
      p.tell('§b珍妮记住了这里的坐标。')
      return 1
    }
    if (action === 'home') {
      if (String(r.getString('jennyDim')) !== String(p.level.dimension)) {
        p.tell('请先在本维度设定营地。')
        return 0
      }
      var x = r.getDouble('jennyX'),
        y = r.getDouble('jennyY'),
        z = r.getDouble('jennyZ')
      p.level.getChunk(Math.floor(x) >> 4, Math.floor(z) >> 4)
      if (!p.level.noCollision(cur, cur.boundingBox.move(x - cur.x, y - cur.y, z - cur.z))) {
        p.tell('营地位置已被方块占用。')
        return 0
      }
      cur.teleportTo(x, y, z)
      cur.setOrderedToSit(true)
      p.tell('§b珍妮已归营待命。')
      return 1
    }
    cur.setOrderedToSit(action === 'stay')
    if (action === 'follow') cur.setHomeModeEnable(false)
    p.tell(action === 'stay' ? '珍妮原地待命。' : '珍妮开始跟随。')
    return 1
  }
  global.mkJennyCommand = command
  ServerEvents.commandRegistry(e => {
    var root = e.commands.literal('mkjenny')
    ;['recruit', 'follow', 'stay', 'sethome', 'home', 'original', 'maid'].forEach(k =>
      root.then(e.commands.literal(k).executes(c => command(c.source.playerOrException, k)))
    )
    e.register(root)
  })
})()
