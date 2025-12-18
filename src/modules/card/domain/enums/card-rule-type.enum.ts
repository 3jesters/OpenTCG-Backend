/**
 * Card Rule Type Enum
 * Defines types of special rules that apply to cards
 *
 * Card rules are always-on modifications to game state or restrictions on actions,
 * different from abilities which are active effects.
 */
export enum CardRuleType {
  // ========================================
  // MOVEMENT RULES
  // ========================================

  /**
   * CANNOT_RETREAT: This Pokémon cannot retreat
   * Example: "This Pokémon can't retreat"
   */
  CANNOT_RETREAT = 'CANNOT_RETREAT',

  /**
   * FORCED_SWITCH: Must switch after certain actions
   * Example: "After this Pokémon attacks, switch it with 1 of your Benched Pokémon"
   */
  FORCED_SWITCH = 'FORCED_SWITCH',

  /**
   * FREE_RETREAT: This Pokémon has no retreat cost
   * Example: "This Pokémon's Retreat Cost is 0"
   */
  FREE_RETREAT = 'FREE_RETREAT',

  // ========================================
  // ATTACK RULES
  // ========================================

  /**
   * CANNOT_ATTACK: This Pokémon cannot attack
   * Example: "This Pokémon can't attack during your next turn"
   */
  CANNOT_ATTACK = 'CANNOT_ATTACK',

  /**
   * ATTACK_COST_MODIFICATION: Modify attack energy costs
   * Example: "This Pokémon's attacks cost 1 less Energy for each damage counter on it"
   */
  ATTACK_COST_MODIFICATION = 'ATTACK_COST_MODIFICATION',

  /**
   * ATTACK_RESTRICTION: Restrictions on which attacks can be used
   * Example: "Can only use this attack if you have more Prize cards than your opponent"
   */
  ATTACK_RESTRICTION = 'ATTACK_RESTRICTION',

  // ========================================
  // DAMAGE RULES
  // ========================================

  /**
   * DAMAGE_IMMUNITY: Prevent all damage from certain sources
   * Example: "Prevent all damage done to this Pokémon by attacks from Pokémon-EX"
   */
  DAMAGE_IMMUNITY = 'DAMAGE_IMMUNITY',

  /**
   * DAMAGE_REDUCTION_RULE: Reduce damage taken
   * Example: "This Pokémon takes 20 less damage from attacks"
   */
  DAMAGE_REDUCTION_RULE = 'DAMAGE_REDUCTION_RULE',

  /**
   * INCREASED_DAMAGE_TAKEN: This Pokémon takes more damage
   * Example: "This Pokémon takes 10 more damage from attacks"
   */
  INCREASED_DAMAGE_TAKEN = 'INCREASED_DAMAGE_TAKEN',

  // ========================================
  // STATUS RULES
  // ========================================

  /**
   * STATUS_IMMUNITY: Cannot be affected by specific status conditions
   * Example: "This Pokémon can't be Paralyzed"
   */
  STATUS_IMMUNITY = 'STATUS_IMMUNITY',

  /**
   * EFFECT_IMMUNITY: Cannot be affected by certain effects
   * Example: "Prevent all effects of attacks, except damage, done to this Pokémon"
   */
  EFFECT_IMMUNITY = 'EFFECT_IMMUNITY',

  /**
   * CANNOT_BE_CONFUSED: Specific immunity to Confusion
   * Example: "This Pokémon can't be Confused"
   */
  CANNOT_BE_CONFUSED = 'CANNOT_BE_CONFUSED',

  // ========================================
  // PRIZE RULES
  // ========================================

  /**
   * EXTRA_PRIZE_CARDS: Opponent takes extra prizes when knocked out
   * Example: "When this Pokémon is Knocked Out, your opponent takes 2 more Prize cards" (VMAX, GX)
   */
  EXTRA_PRIZE_CARDS = 'EXTRA_PRIZE_CARDS',

  /**
   * NO_PRIZE_CARDS: Opponent doesn't take prizes when knocked out
   * Example: "If this Pokémon is Knocked Out, your opponent doesn't take any Prize cards"
   */
  NO_PRIZE_CARDS = 'NO_PRIZE_CARDS',

  // ========================================
  // EVOLUTION RULES
  // ========================================

  /**
   * CAN_EVOLVE_TURN_ONE: Can evolve on first turn
   * Example: "This Pokémon can evolve during your first turn or the turn it was played"
   */
  CAN_EVOLVE_TURN_ONE = 'CAN_EVOLVE_TURN_ONE',

  /**
   * CANNOT_EVOLVE: This Pokémon cannot evolve
   * Example: "This Pokémon can't evolve"
   */
  CANNOT_EVOLVE = 'CANNOT_EVOLVE',

  /**
   * SKIP_EVOLUTION_STAGE: Can skip evolution stages
   * Example: "You may play this card from your hand to evolve a Pokémon during your first turn"
   */
  SKIP_EVOLUTION_STAGE = 'SKIP_EVOLUTION_STAGE',

  // ========================================
  // PLAY RULES
  // ========================================

  /**
   * PLAY_RESTRICTION: Restrictions on when/how card can be played
   * Example: "You can't play this card during your first turn"
   */
  PLAY_RESTRICTION = 'PLAY_RESTRICTION',

  /**
   * ONCE_PER_GAME: Can only use once per game
   * Example: "You can use this GX attack only once per game"
   */
  ONCE_PER_GAME = 'ONCE_PER_GAME',

  /**
   * DISCARD_AFTER_USE: Card is discarded after use
   * Example: "Discard this card after you use it"
   */
  DISCARD_AFTER_USE = 'DISCARD_AFTER_USE',

  // ========================================
  // ENERGY RULES
  // ========================================

  /**
   * ENERGY_COST_REDUCTION: Reduce energy costs
   * Example: "This Pokémon's attacks cost 1 less Colorless Energy"
   */
  ENERGY_COST_REDUCTION = 'ENERGY_COST_REDUCTION',

  /**
   * EXTRA_ENERGY_ATTACHMENT: Can attach extra energy
   * Example: "You may attach 2 Energy cards to this Pokémon during your turn"
   */
  EXTRA_ENERGY_ATTACHMENT = 'EXTRA_ENERGY_ATTACHMENT',

  /**
   * ENERGY_TYPE_CHANGE: Change energy types
   * Example: "All Energy attached to this Pokémon are Fire Energy"
   */
  ENERGY_TYPE_CHANGE = 'ENERGY_TYPE_CHANGE',
}
