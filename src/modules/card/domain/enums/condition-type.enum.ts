export enum ConditionType {
  // No condition - effect always happens
  ALWAYS = 'ALWAYS',

  // Coin flip based
  COIN_FLIP_SUCCESS = 'COIN_FLIP_SUCCESS', // Coin flip was heads
  COIN_FLIP_FAILURE = 'COIN_FLIP_FAILURE', // Coin flip was tails

  // Self (this Pokémon) conditions
  SELF_HAS_DAMAGE = 'SELF_HAS_DAMAGE', // This Pokémon has any damage counters
  SELF_NO_DAMAGE = 'SELF_NO_DAMAGE', // This Pokémon has no damage counters
  SELF_HAS_STATUS = 'SELF_HAS_STATUS', // This Pokémon has a status condition
  SELF_MINIMUM_DAMAGE = 'SELF_MINIMUM_DAMAGE', // This Pokémon has at least X damage

  // Opponent (defending Pokémon) conditions
  OPPONENT_HAS_DAMAGE = 'OPPONENT_HAS_DAMAGE', // Defending Pokémon has damage
  OPPONENT_HAS_STATUS = 'OPPONENT_HAS_STATUS', // Defending Pokémon has any status
  OPPONENT_CONFUSED = 'OPPONENT_CONFUSED', // Defending Pokémon is Confused
  OPPONENT_PARALYZED = 'OPPONENT_PARALYZED', // Defending Pokémon is Paralyzed
  OPPONENT_POISONED = 'OPPONENT_POISONED', // Defending Pokémon is Poisoned
  OPPONENT_BURNED = 'OPPONENT_BURNED', // Defending Pokémon is Burned
  OPPONENT_ASLEEP = 'OPPONENT_ASLEEP', // Defending Pokémon is Asleep

  // Energy conditions
  SELF_HAS_ENERGY_TYPE = 'SELF_HAS_ENERGY_TYPE', // This Pokémon has specific energy type
  SELF_MINIMUM_ENERGY = 'SELF_MINIMUM_ENERGY', // This Pokémon has at least X energy

  // Board state conditions
  OPPONENT_HAS_BENCHED = 'OPPONENT_HAS_BENCHED', // Opponent has benched Pokémon
  SELF_HAS_BENCHED = 'SELF_HAS_BENCHED', // Player has benched Pokémon
  STADIUM_IN_PLAY = 'STADIUM_IN_PLAY', // A Stadium card is in play
}
