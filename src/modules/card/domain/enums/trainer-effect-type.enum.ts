/**
 * Trainer Effect Type Enum
 * Defines the types of effects that Trainer cards can have
 */
export enum TrainerEffectType {
  // ========================================
  // CARD DRAWING & DECK MANIPULATION
  // ========================================
  DRAW_CARDS = 'DRAW_CARDS', // Draw X cards
  SEARCH_DECK = 'SEARCH_DECK', // Search deck for specific cards
  SHUFFLE_DECK = 'SHUFFLE_DECK', // Shuffle your deck
  LOOK_AT_DECK = 'LOOK_AT_DECK', // Look at top X cards

  // ========================================
  // CARD DISCARD & RETRIEVAL
  // ========================================
  DISCARD_HAND = 'DISCARD_HAND', // Discard cards from hand
  RETRIEVE_FROM_DISCARD = 'RETRIEVE_FROM_DISCARD', // Get cards from discard pile
  OPPONENT_DISCARDS = 'OPPONENT_DISCARDS', // Opponent discards cards

  // ========================================
  // POKÉMON MANIPULATION
  // ========================================
  SWITCH_ACTIVE = 'SWITCH_ACTIVE', // Switch active Pokémon
  RETURN_TO_HAND = 'RETURN_TO_HAND', // Return Pokémon to hand (Scoop Up)
  RETURN_TO_DECK = 'RETURN_TO_DECK', // Return Pokémon and attached cards to deck (Mr. Fuji)
  FORCE_SWITCH = 'FORCE_SWITCH', // Force opponent to switch (Gust of Wind)
  EVOLVE_POKEMON = 'EVOLVE_POKEMON', // Force evolution (Pokémon Breeder)
  DEVOLVE_POKEMON = 'DEVOLVE_POKEMON', // Devolve Pokémon (Devolution Spray)
  PUT_INTO_PLAY = 'PUT_INTO_PLAY', // Put Pokémon into play from discard

  // ========================================
  // HEALING & DAMAGE REMOVAL
  // ========================================
  HEAL = 'HEAL', // Remove damage counters
  CURE_STATUS = 'CURE_STATUS', // Remove status conditions

  // ========================================
  // ENERGY MANIPULATION
  // ========================================
  REMOVE_ENERGY = 'REMOVE_ENERGY', // Remove energy cards
  RETRIEVE_ENERGY = 'RETRIEVE_ENERGY', // Get energy from discard
  DISCARD_ENERGY = 'DISCARD_ENERGY', // Discard energy

  // ========================================
  // DAMAGE MODIFICATION
  // ========================================
  INCREASE_DAMAGE = 'INCREASE_DAMAGE', // Increase damage dealt (PlusPower)
  REDUCE_DAMAGE = 'REDUCE_DAMAGE', // Reduce damage taken (Defender)

  // ========================================
  // OPPONENT MANIPULATION
  // ========================================
  OPPONENT_DRAWS = 'OPPONENT_DRAWS', // Opponent draws cards (Impostor Oak)
  OPPONENT_SHUFFLES_HAND = 'OPPONENT_SHUFFLES_HAND', // Opponent shuffles hand into deck

  // ========================================
  // SPECIAL EFFECTS
  // ========================================
  TRADE_CARDS = 'TRADE_CARDS', // Trade cards (Pokémon Trader)
  ATTACH_TO_POKEMON = 'ATTACH_TO_POKEMON', // Attach this card to a Pokémon (Tools)
}

