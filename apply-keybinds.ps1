$ErrorActionPreference = 'Stop'
$root = 'C:\Users\belfry\workspaceRE\mc-anime\game\.minecraft'
$opt  = Join-Path $root 'options.txt'

if (Get-Process javaw -ErrorAction SilentlyContinue) {
  Write-Host 'Minecraft is still running. Close it first, then run this again.'
  exit 1
}
if (-not (Test-Path $opt)) { Write-Host 'options.txt not found.'; exit 1 }

Copy-Item $opt "$opt.bak" -Force

$map = [ordered]@{
  # ---- vanilla ----
  'key.swapOffhand'                        = 'key.keyboard.q:CONTROL'
  'key.advancements'                       = 'key.keyboard.l:ALT'

  # ---- Epic Fight ----
  'key.epicfight.attack'                   = 'key.mouse.left'
  'key.epicfight.guard'                    = 'key.mouse.right'
  'key.epicfight.switch_mode'              = 'key.keyboard.f'
  'key.epicfight.dodge'                    = 'key.keyboard.left.alt'
  'key.epicfight.lock_on'                  = 'key.keyboard.g'
  'key.epicfight.mover_skill'              = 'key.keyboard.space'
  'key.epicfight.weapon_innate_skill'      = 'key.keyboard.f:CONTROL'
  'key.epicfight.skill_gui'                = 'key.keyboard.k'
  'key.epicfight.gui'                      = 'key.keyboard.k:CONTROL'
  'key.epicfight.config'                   = 'key.keyboard.k:ALT'

  # ---- TaCZ ----
  'key.tacz.shoot.desc'                    = 'key.mouse.left'
  'key.tacz.aim.desc'                      = 'key.mouse.right'
  'key.tacz.reload.desc'                   = 'key.keyboard.r'
  'key.tacz.unload.desc'                   = 'key.keyboard.r:ALT'
  'key.tacz.melee.desc'                    = 'key.keyboard.v'
  'key.tacz.fire_select.desc'              = 'key.keyboard.b'
  'key.tacz.inspect.desc'                  = 'key.keyboard.h'
  'key.tacz.refit.desc'                    = 'key.keyboard.z'
  'key.tacz.zoom.desc'                     = 'key.keyboard.z:CONTROL'
  'key.tacz.crawl.desc'                    = 'key.keyboard.v:CONTROL'
  'key.tacz.interact.desc'                 = 'key.keyboard.o'
  'key.tacz.open_config.desc'              = 'key.keyboard.t:ALT'

  # ---- Iron's Spellbooks ----
  'key.irons_spellbooks.spell_wheel'       = 'key.keyboard.u'
  'key.irons_spellbooks.spellbook_cast'    = 'key.keyboard.y'
  'key.irons_spellbooks.spell_bar_modifier'= 'key.keyboard.left.alt:CONTROL'

  # ---- Touhou Little Maid ----
  'key.touhou_little_maid.stt_chat.desc'          = 'key.keyboard.x'
  'key.touhou_little_maid.dismount.desc'          = 'key.keyboard.c'
  'key.touhou_little_maid_spell.open_ender_pocket'= 'key.keyboard.u:CONTROL'

  # ---- maidmarriage ----
  'key.maidmarriage.interaction'           = 'key.keyboard.j'
  'key.maidmarriage.pet_head'              = 'key.keyboard.k:ALT'
  'key.maidmarriage.rhythm_hit'            = 'key.keyboard.j:ALT'
  'key.maidmarriage.carry_pose_debug'      = 'key.keyboard.unknown'
  'key.maidmarriage.maid_debug_panel'      = 'key.keyboard.unknown'

  # ---- Affection ----
  'key.touhou_maid_affection.kiss_carried_maid'   = 'key.keyboard.v:CONTROL'
  'key.touhou_maid_affection.kiss_targeted_maid'  = 'key.keyboard.v:CONTROL'
  'key.touhou_maid_affection.lap_pillow'          = 'key.keyboard.equal'
  'key.touhou_maid_affection.lap_pillow_angle_lock'= 'key.keyboard.equal:CONTROL'
  'key.touhou_maid_affection.voice_preview'       = 'key.mouse.right:CONTROL'

  # ---- contract blade ----
  'key.maid_weapon.call_companion'         = 'key.keyboard.right.bracket'
  'key.maid_weapon.danmaku'                = 'key.mouse.middle'
  'key.maid_weapon.oath_manifestation'     = 'key.keyboard.grave.accent'

  # ---- Cataclysm ----
  'key.cataclysm.ability'                  = 'key.keyboard.x:ALT'
  'key.cataclysm.helmet_ability'           = 'key.keyboard.1:ALT'
  'key.cataclysm.chestplate_ability'       = 'key.keyboard.2:ALT'
  'key.cataclysm.boots_ability'            = 'key.keyboard.3:ALT'

  # ---- Curios ----
  'key.curios.open.desc'                   = 'key.keyboard.c:ALT'

  # ---- Mekanism ----
  'key.mekanism.mode'                      = 'key.keyboard.n'
  'key.mekanism.key_hud'                   = 'key.keyboard.h:CONTROL'
  'key.mekanism.head_mode'                 = 'key.keyboard.unknown'
  'key.mekanism.chest_mode'                = 'key.keyboard.unknown'
  'key.mekanism.legs_mode'                 = 'key.keyboard.unknown'
  'key.mekanism.feet_mode'                 = 'key.keyboard.unknown'

  # ---- YSM ----
  'key.yes_steve_model.player_model.desc'  = 'key.keyboard.y:ALT'
  'key.yes_steve_model.animation_roulette.desc' = 'key.keyboard.z:ALT'
  'key.yes_steve_model.lock_roulette.desc' = 'key.keyboard.unknown'
  'key.yes_steve_model.debug_animation.desc'    = 'key.keyboard.unknown'

  # ---- misc ----
  'key.maid_useful_tasks.switch_vehicle_control' = 'key.keyboard.c:CONTROL'
  'key.Quest Log'                          = 'key.keyboard.l:CONTROL'
  'key.rimulib.cutscenes'                  = 'key.keyboard.unknown'
  'key.rimulib.skill_menu'                 = 'key.keyboard.unknown'
  'key.shooting_star_demo.stellar_remote.the_shooting_star' = 'key.keyboard.unknown'
  'key.shooting_star_demo.stellar_remote.gungnir'           = 'key.keyboard.unknown'
  'key.shooting_star_demo.stellar_remote.seven_stars'       = 'key.keyboard.unknown'
  'key.shooting_star_demo.stellar_remote.tesseract'         = 'key.keyboard.unknown'
}

$lines = Get-Content $opt -Encoding UTF8
$out = New-Object System.Collections.Generic.List[string]
$seen = @{}

foreach ($line in $lines) {
  if ($line -match '^key_(.+?):(.*)$') {
    $id = $matches[1]
    if ($map.Contains($id)) {
      $out.Add("key_$id" + ':' + $map[$id])
      $seen[$id] = $true
      continue
    }
  }
  $out.Add($line)
}
foreach ($k in $map.Keys) {
  if (-not $seen.ContainsKey($k)) { $out.Add("key_$k" + ':' + $map[$k]) }
}

[System.IO.File]::WriteAllLines($opt, $out, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "Keybinds applied. Backup: $opt.bak"
