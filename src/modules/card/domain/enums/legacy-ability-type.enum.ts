/**
 * Legacy Ability Type Enum
 * Represents the original Pokémon TCG ability mechanics that have been unified into "Ability"
 * 
 * Historical Timeline:
 * - Pokémon Power (Base Set - Neo, 1999-2003)
 * - Poké-Body & Poké-Power (EX era, 2003-2010)
 * - Ability (Black & White onwards, 2011-present)
 * 
 * This enum is used for:
 * - Importing legacy cards
 * - Display purposes (showing original mechanic name)
 * - Historical accuracy in card databases
 */
export enum LegacyAbilityType {
  /**
   * POKEMON_POWER: Original mechanic from Base Set through Neo series
   * Could be always-on or activated
   * Example: Charizard's "Energy Burn"
   */
  POKEMON_POWER = 'POKEMON_POWER',

  /**
   * POKE_BODY: Always-on passive effect (EX era)
   * Equivalent to modern PASSIVE abilities
   * Example: Blaziken's "Blaze"
   */
  POKE_BODY = 'POKE_BODY',

  /**
   * POKE_POWER: Activated effect, usually once per turn (EX era)
   * Equivalent to modern ACTIVATED abilities
   * Example: Gardevoir's "Psy Shadow"
   */
  POKE_POWER = 'POKE_POWER',
}

