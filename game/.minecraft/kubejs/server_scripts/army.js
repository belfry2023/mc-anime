// priority: 80
// The roster belongs to the world and the owner's UUID. An unloaded slot stays occupied.
;(function () {
  var Slots = Java.loadClass('net.minecraft.world.entity.EquipmentSlot')
  var A = Java.loadClass('net.minecraft.world.entity.ai.attributes.Attributes')
  var Pos = Java.loadClass('net.minecraft.core.BlockPos')
  var Dir = Java.loadClass('net.minecraft.core.Direction')
  var UUID = Java.loadClass('java.util.UUID')
  var Tasks = Java.loadClass('com.github.tartaricacid.touhoulittlemaid.entity.task.TaskManager')
  var Stats = Java.loadClass('cn.blockforge.touhou_little_maid_personality.emotion.MaidStatsStore')
  var roles = {
    saint: { name: '圣女', model: 'geckolib:winefox_saint', hp: 840, atk: 42, speed: 0.32, task: 'idle' },
    star: { name: '斯塔·柏', model: 'geckolib:sta', hp: 720, atk: 36, speed: 0.36, task: 'gun_attack' },
    fox: {
      name: '新春纸板狐',
      model: 'geckolib:zhiban_new_year',
      hp: 640,
      atk: 32,
      speed: 0.38,
      task: 'gun_attack'
    },
    magic: {
      name: '魔法女仆',
      model: 'geckolib:winefox_magical',
      hp: 1024,
      atk: 160,
      speed: 0.56,
      task: 'attack'
    }
  }
  var maidId = 'touhou_little_maid:maid'
  function roster(p) {
    var data = p.server.persistentData
    var key = 'mkRoster_' + p.uuid
    if (!data.contains(key)) data.put(key, NBT.compoundTag())
    return data.getCompound(key)
  }
  function roleOf(e) {
    return e ? String(e.persistentData.getString('mkRole')) : ''
  }
  function ownerOf(e) {
    return e && String(e.type) === maidId ? String(e.getOwnerUUID()) : ''
  }
  function lookup(level, id) {
    return id ? level.getEntity(UUID.fromString(String(id))) : null
  }
  function get(p, role) {
    var e = lookup(p.level, roster(p).getString(role))
    return e && e.isAlive() && ownerOf(e) === String(p.uuid) && roleOf(e) === role ? e : null
  }
  function maxBond(m) {
    m.setFavorability(384)
    var stats = Stats.get(m)
    stats.applyPreset(100, 100, 0, 100, 100, 0)
    stats.favorability = m.getFavorability()
    Stats.save(m, stats)
  }
  function attachment(id) {
    var item = NBT.compoundTag()
    item.putString('id', 'tacz:attachment')
    item.putByte('Count', 1)
    var tag = NBT.compoundTag()
    tag.putString('AttachmentId', 'lradd:' + id)
    item.put('tag', tag)
    return item
  }
  function rifle() {
    var tag = NBT.compoundTag()
    tag.putString('GunId', 'lradd:qbz191_em')
    tag.putString('GunFireMode', 'AUTO')
    tag.putInt('GunCurrentAmmoCount', 30)
    tag.putBoolean('HasBulletInBarrel', true)
    tag.put('AttachmentMUZZLE', attachment('muzzle_s_c784'))
    tag.put('AttachmentSCOPE', attachment('scope_re'))
    tag.put('AttachmentGRIP', attachment('grip_cqr_g2'))
    return Item.of('tacz:modern_kinetic_gun', tag)
  }
  function equip(m, key) {
    if (key === 'star' || key === 'fox') {
      m.setItemSlot(Slots.MAINHAND, rifle())
      m.getAvailableInv(false).insertItem(0, Item.of('tacz:ammo', 64, { AmmoId: 'tacz:58x42' }), false)
    } else if (key === 'saint') {
      m.setItemSlot(Slots.MAINHAND, Item.of('touhou_little_maid_spell:star_shadow_staff'))
    } else {
      m.setItemSlot(
        Slots.MAINHAND,
        Item.of('epicfight:netherite_tachi', {
          Unbreakable: true,
          display: { Name: '{"text":"神器太刀·断潮","color":"gold","italic":false}' },
          Enchantments: [{ id: 'minecraft:sharpness', lvl: 5 }]
        })
      )
    }
  }
  function safeSpot(e, near, radius, offset) {
    var level = near.level
    var dxz = [
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [0, 0]
    ]
    for (var r = radius; r >= 1; r--) {
      for (var j = 0; j < dxz.length; j++) {
        var dir = dxz[(j + (offset || 0)) % dxz.length]
        var x = Math.floor(near.x) + dir[0] * r + 0.5,
          z = Math.floor(near.z) + dir[1] * r + 0.5
        for (var h = 0; h < 5; h++) {
          var y = Math.floor(near.y) + [0, 1, -1, 2, -2][h],
            block = Pos.containing(x, y - 1, z)
          var box = e.boundingBox.move(x - e.x, y - e.y, z - e.z)
          if (
            level.getBlockState(block).isFaceSturdy(level, block, Dir.UP) &&
            level.noCollision(e, box) &&
            !level.containsAnyLiquid(box) &&
            level.getWorldBorder().isWithinBounds(x, z)
          )
            return [x, y, z]
        }
      }
    }
    return null
  }
  function setup(m, key, fresh) {
    var r = roles[key],
      d = m.persistentData
    m.setCustomName(Text.of(r.name))
    m.setModelId(r.model)
    m.setPersistenceRequired()
    m.addTag('mk_' + key)
    m.addTag('mk_role_' + key)
    d.putString('mkRole', key)
    m.getAttribute(A.MAX_HEALTH).setBaseValue(r.hp)
    m.getAttribute(A.ATTACK_DAMAGE).setBaseValue(r.atk)
    m.getAttribute(A.MOVEMENT_SPEED).setBaseValue(r.speed)
    m.getAttribute(A.ARMOR).setBaseValue(24)
    m.getAttribute(A.ARMOR_TOUGHNESS).setBaseValue(12)
    m.getAttribute(A.KNOCKBACK_RESISTANCE).setBaseValue(0.85)
    m.setTask(Tasks.findTask('touhou_little_maid:' + r.task).orElseThrow())
    d.putInt('mkEnergy', key === 'saint' ? 120 : key === 'star' ? 240 : 0)
    if (fresh) {
      equip(m, key)
      ;['HEAD', 'CHEST', 'LEGS', 'FEET'].forEach((slot, i) =>
        m.setItemSlot(
          Slots[slot],
          Item.of('minecraft:netherite_' + ['helmet', 'chestplate', 'leggings', 'boots'][i])
        )
      )
    } else {
      // Preserve player loadouts. Apply the new preset only to unmodified starter items.
      var hand = m.getMainHandItem(),
        nbt = hand.nbt
      var basicSword =
        String(hand.id) === 'minecraft:netherite_sword' &&
        (!nbt || (nbt.size() === 1 && nbt.contains('Damage') && hand.damageValue === 0))
      var gun =
        String(hand.id) === 'tacz:modern_kinetic_gun' &&
        nbt &&
        String(nbt.getString('GunId')) === 'lradd:qbz191_em'
      var stockGun = false
      if (gun) {
        var extras = nbt.copy()
        ;['GunId', 'GunCurrentAmmoCount', 'HasBulletInBarrel', 'GunFireMode'].forEach(k => extras.remove(k))
        stockGun = extras.isEmpty()
      }
      if (
        hand.isEmpty() ||
        ((key === 'saint' || key === 'magic') && basicSword) ||
        ((key === 'star' || key === 'fox') && stockGun)
      )
        equip(m, key)
        // Only strip the permanent blanket effects granted by the old /mkarmy.
      ;['regeneration', 'resistance', 'absorption', 'health_boost', 'strength', 'speed'].forEach(id => {
        var effect = m.getEffect('minecraft:' + id)
        if (effect && effect.isInfiniteDuration() && effect.getAmplifier() === 5)
          m.removeEffect('minecraft:' + id)
      })
    }
    maxBond(m)
    m.setHealth(m.getMaxHealth())
  }
  function ensure(p) {
    var record = roster(p)
    var made = 0
    Object.keys(roles).forEach(key => {
      if (record.contains(key)) return
      // Adopt the previous script's owned and tagged maid, including other loaded dimensions.
      var old = null
      p.server.getAllLevels().forEach(level => {
        if (old) return
        for (var e of level.getAllEntities()) {
          if (
            String(e.type) === maidId &&
            e.tags.contains('mk_role_' + key) &&
            ownerOf(e) === String(p.uuid) &&
            e.isAlive()
          ) {
            old = e
            break
          }
        }
      })
      var m = old || p.level.createEntity(maidId)
      if (!old) {
        var spot = safeSpot(m, p, 2, Object.keys(roles).indexOf(key))
        if (!spot) {
          p.tell('§e周围没有可站立的空地。到平地使用 /mkarmy 补齐空位。')
          return
        }
        m.setPos(spot[0], spot[1], spot[2])
        m.tame(p)
      }
      setup(m, key, !old)
      if (!old && !p.level.addFreshEntity(m)) return
      // Spawn listeners can apply native personality defaults. Set bond after insertion as well.
      maxBond(m)
      record.putString(key, String(m.uuid))
      made++
    })
    if (made) p.tell('§b已签约 ' + made + ' 名队员。用 /mkcheck 检查装备与羁绊，/mkstatus 查看任务。')
    return Object.keys(roles).every(key => record.contains(key))
  }
  function inspect(p) {
    if (Object.keys(roles).every(key => get(p, key))) global.mkQuestMark(p, 'rollcall')
    Object.keys(roles).forEach(key => {
      var m = get(p, key)
      if (!m) {
        p.tell(roles[key].name + ' · ' + (roster(p).contains(key) ? '离队、倒下或区块未加载' : '尚未签约'))
        return
      }
      var s = Stats.get(m)
      p.tell(
        roles[key].name +
          ' · ' +
          Math.ceil(m.health) +
          '/' +
          Math.ceil(m.maxHealth) +
          ' HP · ' +
          m.getMainHandItem().getHoverName().getString() +
          ' · 好感 ' +
          m.getFavorability() +
          ' · 忠诚/情绪/亲近/执念 ' +
          [s.loyalty, s.mood, s.closeness, s.obsession].join('/')
      )
    })
  }
  global.mkSquad = {
    roles: roles,
    roster: roster,
    roleOf: roleOf,
    ownerOf: ownerOf,
    get: get,
    lookup: lookup,
    safeSpot: safeSpot,
    ensure: ensure,
    maxBond: maxBond,
    rifle: rifle,
    inspect: inspect
  }
  ServerEvents.commandRegistry(e => {
    e.register(e.commands.literal('mkarmy').executes(c => (ensure(c.source.playerOrException) ? 1 : 0)))
    e.register(
      e.commands.literal('mkcheck').executes(c => {
        inspect(c.source.playerOrException)
        return 1
      })
    )
  })
})()
