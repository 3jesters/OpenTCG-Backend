/**
 * Ability Effect Type Enum
 * Defines the types of effects that abilities can have
 *
 * Includes both shared effect types (also used in attacks) and ability-specific effects
 */
export enum AbilityEffectType {
  // ========================================
  // SHARED WITH ATTACK EFFECTS
  // ========================================

  /**
   * HEAL: Heal damage from Pokémon
   * Shared with attacks
   */
  HEAL = 'HEAL',

  /**
   * PREVENT_DAMAGE: Prevent damage to Pokémon
   * Shared with attacks
   */
  PREVENT_DAMAGE = 'PREVENT_DAMAGE',

  /**
   * STATUS_CONDITION: Apply status condition
   * Shared with attacks
   */
  STATUS_CONDITION = 'STATUS_CONDITION',

  /**
   * ENERGY_ACCELERATION: Attach energy from deck/discard/hand
   * Shared with attacks
   */
  ENERGY_ACCELERATION = 'ENERGY_ACCELERATION',

  /**
   * SWITCH_POKEMON: Switch active or benched Pokémon
   * Shared with attacks
   */
  SWITCH_POKEMON = 'SWITCH_POKEMON',

  // ========================================
  // ABILITY-SPECIFIC EFFECTS
  // ========================================

  /**
   * DRAW_CARDS: Draw cards from deck
   * Example: "Draw 2 cards"
   */
  DRAW_CARDS = 'DRAW_CARDS',

  /**
   * SEARCH_DECK: Search deck for specific cards
   * Example: "Search your deck for a Fire Pokémon and put it in your hand"
   */
  SEARCH_DECK = 'SEARCH_DECK',

  /**
   * BOOST_ATTACK: Increase attack damage (for self or allies)
   * Example: "All your Fire Pokémon do 10 more damage"
   */
  BOOST_ATTACK = 'BOOST_ATTACK',

  /**
   * BOOST_HP: Increase maximum HP
   * Example: "This Pokémon's maximum HP is increased by 30"
   */
  BOOST_HP = 'BOOST_HP',

  /**
   * REDUCE_DAMAGE: Reduce incoming damage
   * Example: "Prevent 20 damage done to this Pokémon"
   */
  REDUCE_DAMAGE = 'REDUCE_DAMAGE',

  /**
   * DISCARD_FROM_HAND: Discard cards from hand
   * Example: "Discard a card from your hand"
   */
  DISCARD_FROM_HAND = 'DISCARD_FROM_HAND',

  /**
   * ATTACH_FROM_DISCARD: Attach cards from discard pile
   * Example: "Attach a Fire Energy from your discard pile to this Pokémon"
   */
  ATTACH_FROM_DISCARD = 'ATTACH_FROM_DISCARD',

  /**
   * RETRIEVE_FROM_DISCARD: Put cards from discard pile to hand
   * Example: "Put 2 Pokémon from your discard pile into your hand"
   */
  RETRIEVE_FROM_DISCARD = 'RETRIEVE_FROM_DISCARD',
}
