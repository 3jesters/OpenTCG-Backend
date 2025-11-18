/**
 * Target Type Enum
 * Defines valid targets for effects (abilities and attacks)
 */
export enum TargetType {
  // Self targeting
  SELF = 'SELF',

  // Your Pokémon
  ALL_YOURS = 'ALL_YOURS',
  ACTIVE_YOURS = 'ACTIVE_YOURS',
  BENCHED_YOURS = 'BENCHED_YOURS',

  // Opponent's Pokémon
  ALL_OPPONENTS = 'ALL_OPPONENTS',
  ACTIVE_OPPONENT = 'ACTIVE_OPPONENT',
  BENCHED_OPPONENTS = 'BENCHED_OPPONENTS',
  DEFENDING = 'DEFENDING',
}

