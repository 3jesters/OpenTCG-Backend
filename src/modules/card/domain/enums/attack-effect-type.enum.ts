export enum AttackEffectType {
  // Core Effects
  DISCARD_ENERGY = 'DISCARD_ENERGY', // Discard energy from this or defending Pokémon
  STATUS_CONDITION = 'STATUS_CONDITION', // Apply status condition to defending Pokémon
  DAMAGE_MODIFIER = 'DAMAGE_MODIFIER', // Increase or decrease attack damage
  HEAL = 'HEAL', // Heal damage from this or defending Pokémon

  // Additional Effects
  PREVENT_DAMAGE = 'PREVENT_DAMAGE', // Prevent damage during next turn
  RECOIL_DAMAGE = 'RECOIL_DAMAGE', // This Pokémon takes recoil damage
  ENERGY_ACCELERATION = 'ENERGY_ACCELERATION', // Attach energy from deck/discard/hand
  SWITCH_POKEMON = 'SWITCH_POKEMON', // Switch this Pokémon with benched
}
