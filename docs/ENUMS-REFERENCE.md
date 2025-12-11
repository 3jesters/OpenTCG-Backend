# OpenTCG Enums Reference

Complete reference guide for all enum types used throughout the OpenTCG backend system.

---

## Table of Contents

1. [Card Domain Enums](#card-domain-enums)
2. [Match Domain Enums](#match-domain-enums)
3. [Tournament Domain Enums](#tournament-domain-enums)
4. [Usage Examples](#usage-examples)
5. [Enum Relationships](#enum-relationships)

---

## Card Domain Enums

### CardType

**Purpose:** Defines the three main types of cards in the game.

**Values:**
- `POKEMON` - Pokémon cards (creatures with attacks and abilities)
- `TRAINER` - Trainer cards (items, supporters, stadiums, tools)
- `ENERGY` - Energy cards (provide energy to power attacks)

**Usage:** Used in `Card` entity to identify card type. Determines which fields are required/optional.

**Example:**
```typescript
card.cardType === CardType.POKEMON
```

---

### PokemonType

**Purpose:** Defines the elemental types of Pokémon and energy.

**Values:**
- `FIRE` - Fire type
- `WATER` - Water type
- `GRASS` - Grass type
- `ELECTRIC` - Electric type
- `PSYCHIC` - Psychic type
- `FIGHTING` - Fighting type
- `DARKNESS` - Darkness type
- `METAL` - Metal type
- `FAIRY` - Fairy type
- `DRAGON` - Dragon type
- `COLORLESS` - Colorless type (neutral)

**Usage:** Used in `Card` entity for `pokemonType` field. Also used for type matching in weaknesses, resistances, and energy requirements.

**Example:**
```typescript
card.pokemonType === PokemonType.FIRE
```

---

### EnergyType

**Purpose:** Defines the types of energy cards. Values match `PokemonType` for consistency.

**Values:** (Same as `PokemonType`)
- `FIRE`, `WATER`, `GRASS`, `ELECTRIC`, `PSYCHIC`, `FIGHTING`, `DARKNESS`, `METAL`, `FAIRY`, `DRAGON`, `COLORLESS`

**Usage:** Used in `Card` entity for `energyType` field on energy cards. Used for energy type restrictions in ability and attack effects.

**Example:**
```typescript
energyCard.energyType === EnergyType.WATER
```

---

### TrainerType

**Purpose:** Defines the subtypes of trainer cards.

**Values:**
- `ITEM` - Item cards (can be played multiple per turn)
- `SUPPORTER` - Supporter cards (one per turn)
- `STADIUM` - Stadium cards (stay in play, affect both players)
- `TOOL` - Tool cards (attach to Pokémon)

**Usage:** Used in `Card` entity for `trainerType` field. Determines play restrictions and behavior.

**Example:**
```typescript
card.trainerType === TrainerType.SUPPORTER
```

---

### EvolutionStage

**Purpose:** Defines the evolution stages of Pokémon cards.

**Values:**
- `BASIC` - Basic Pokémon (no evolution required)
- `STAGE_1` - First stage evolution
- `STAGE_2` - Second stage evolution
- `VMAX` - VMAX Pokémon (special evolution)
- `VSTAR` - VSTAR Pokémon (special evolution)
- `GX` - GX Pokémon (special evolution)
- `EX` - EX Pokémon (special evolution)
- `MEGA` - Mega Evolution Pokémon
- `BREAK` - BREAK evolution
- `LEGEND` - Legendary Pokémon

**Usage:** Used in `Card` entity for `stage` field. Determines evolution requirements and play restrictions.

**Example:**
```typescript
card.stage === EvolutionStage.STAGE_2
```

---

### Rarity

**Purpose:** Defines the rarity levels of cards.

**Values:**
- `COMMON` - Common cards
- `UNCOMMON` - Uncommon cards
- `RARE` - Rare cards
- `HOLO_RARE` - Holographic rare cards
- `RARE_HOLO` - Rare holographic cards (alternative naming)
- `ULTRA_RARE` - Ultra rare cards
- `SECRET_RARE` - Secret rare cards
- `PROMO` - Promotional cards

**Usage:** Used in `Card` entity for `rarity` field. Used for display and collection purposes.

**Example:**
```typescript
card.rarity === Rarity.RARE_HOLO
```

---

### AbilityActivationType

**Purpose:** Defines how abilities are activated during gameplay.

**Values:**
- `PASSIVE` - Always active, no player action required
  - Example: "All your Fire Pokémon do 10 more damage"
- `TRIGGERED` - Automatically activates when a specific game event occurs
  - Example: "When this Pokémon takes damage, draw a card"
- `ACTIVATED` - Player chooses to use it, often with usage limits
  - Example: "Once during your turn, you may heal 30 damage from this Pokémon"

**Usage:** Used in `Ability` value object. Determines whether ability requires `USE_ABILITY` action or activates automatically.

**Example:**
```typescript
ability.activationType === AbilityActivationType.ACTIVATED
```

---

### UsageLimit

**Purpose:** Defines how often an ability or effect can be used.

**Values:**
- `ONCE_PER_TURN` - Can be used once per turn
  - Example: "Once during your turn, you may..."
- `UNLIMITED` - Can be used multiple times
  - Example: "As often as you like during your turn..."

**Usage:** Used in `Ability` value object. Determines usage tracking in game state.

**Example:**
```typescript
ability.usageLimit === UsageLimit.ONCE_PER_TURN
```

---

### AbilityEffectType

**Purpose:** Defines the types of effects that abilities can have.

**Values:**

**Shared with Attack Effects:**
- `HEAL` - Heal damage from Pokémon
- `PREVENT_DAMAGE` - Prevent damage to Pokémon
- `STATUS_CONDITION` - Apply status condition
- `ENERGY_ACCELERATION` - Attach energy from deck/discard/hand
- `SWITCH_POKEMON` - Switch active or benched Pokémon

**Ability-Specific Effects:**
- `DRAW_CARDS` - Draw cards from deck
- `SEARCH_DECK` - Search deck for specific cards
- `BOOST_ATTACK` - Increase attack damage (for self or allies)
- `BOOST_HP` - Increase maximum HP
- `REDUCE_DAMAGE` - Reduce incoming damage
- `DISCARD_FROM_HAND` - Discard cards from hand
- `ATTACH_FROM_DISCARD` - Attach cards from discard pile
- `RETRIEVE_FROM_DISCARD` - Put cards from discard pile to hand

**Usage:** Used in `AbilityEffect` interfaces to define effect types.

**Example:**
```typescript
effect.effectType === AbilityEffectType.ENERGY_ACCELERATION
```

---

### TargetType

**Purpose:** Defines valid targets for effects (abilities and attacks).

**Values:**

**Self Targeting:**
- `SELF` - The Pokémon using the ability/attack

**Your Pokémon:**
- `ALL_YOURS` - All your Pokémon (active + bench)
- `ACTIVE_YOURS` - Your active Pokémon
- `BENCHED_YOURS` - Your benched Pokémon

**Opponent's Pokémon:**
- `ALL_OPPONENTS` - All opponent's Pokémon (active + bench)
- `ACTIVE_OPPONENT` - Opponent's active Pokémon
- `BENCHED_OPPONENTS` - Opponent's benched Pokémon
- `DEFENDING` - The defending Pokémon (target of attack)

**Usage:** Used in effect interfaces to specify valid targets. Determines which Pokémon can be selected for effects.

**Example:**
```typescript
effect.target === TargetType.ALL_YOURS
```

---

### EnergySource

**Purpose:** Defines valid sources for energy acceleration effects.

**Values:**
- `DECK` - Energy from deck
- `DISCARD` - Energy from discard pile
- `HAND` - Energy from hand
- `SELF` - Energy attached to the Pokémon using the ability

**Usage:** Used in `EnergyAccelerationAbilityEffect` to specify where energy comes from.

**Example:**
```typescript
effect.source === EnergySource.HAND
```

---

### Duration

**Purpose:** Defines valid durations for effects.

**Values:**
- `next_turn` - Effect lasts until next turn
- `this_turn` - Effect lasts for current turn only
- `permanent` - Effect lasts permanently (until removed)

**Usage:** Used in effect interfaces like `PreventDamageAbilityEffect` to specify how long effects last.

**Example:**
```typescript
effect.duration === Duration.NEXT_TURN
```

---

### Selector

**Purpose:** Defines how cards are selected.

**Values:**
- `choice` - Player chooses cards
- `random` - Cards are selected randomly

**Usage:** Used in effects that require card selection (e.g., `SearchDeckEffect`, `DiscardFromHandEffect`).

**Example:**
```typescript
effect.selector === Selector.CHOICE
```

---

### Destination

**Purpose:** Defines where cards go when moved/searched.

**Values:**
- `hand` - Cards go to hand
- `bench` - Cards go to bench

**Usage:** Used in `SearchDeckEffect` to specify where searched cards are placed.

**Example:**
```typescript
effect.destination === Destination.HAND
```

---

### StatusCondition

**Purpose:** Represents status conditions that can be applied via abilities.

**Note:** This is separate from `StatusEffect` enum in match domain to maintain domain separation.

**Values:**
- `PARALYZED` - Pokémon is paralyzed (can't attack or retreat)
- `POISONED` - Pokémon is poisoned (takes damage between turns)
- `BURNED` - Pokémon is burned (takes damage between turns, coin flip to remove)
- `ASLEEP` - Pokémon is asleep (coin flip to wake up)
- `CONFUSED` - Pokémon is confused (coin flip to attack successfully)

**Usage:** Used in `StatusConditionAbilityEffect` to specify which status condition to apply.

**Example:**
```typescript
effect.statusCondition === StatusCondition.POISONED
```

---

### TrainerEffectType

**Purpose:** Defines the types of effects that Trainer cards can have.

**Values:**

**Card Drawing & Deck Manipulation:**
- `DRAW_CARDS` - Draw X cards
- `SEARCH_DECK` - Search deck for specific cards
- `SHUFFLE_DECK` - Shuffle your deck
- `LOOK_AT_DECK` - Look at top X cards

**Card Discard & Retrieval:**
- `DISCARD_HAND` - Discard cards from hand
- `RETRIEVE_FROM_DISCARD` - Get cards from discard pile
- `OPPONENT_DISCARDS` - Opponent discards cards

**Pokémon Manipulation:**
- `SWITCH_ACTIVE` - Switch active Pokémon
- `RETURN_TO_HAND` - Return Pokémon to hand (Scoop Up)
- `FORCE_SWITCH` - Force opponent to switch (Gust of Wind)
- `EVOLVE_POKEMON` - Force evolution (Pokémon Breeder)
- `DEVOLVE_POKEMON` - Devolve Pokémon (Devolution Spray)
- `PUT_INTO_PLAY` - Put Pokémon into play from discard

**Healing & Damage Removal:**
- `HEAL` - Remove damage counters
- `CURE_STATUS` - Remove status conditions

**Energy Manipulation:**
- `REMOVE_ENERGY` - Remove energy cards
- `RETRIEVE_ENERGY` - Get energy from discard
- `DISCARD_ENERGY` - Discard energy

**Damage Modification:**
- `INCREASE_DAMAGE` - Increase damage dealt (PlusPower)
- `REDUCE_DAMAGE` - Reduce damage taken (Defender)

**Opponent Manipulation:**
- `OPPONENT_DRAWS` - Opponent draws cards (Impostor Oak)
- `OPPONENT_SHUFFLES_HAND` - Opponent shuffles hand into deck

**Special Effects:**
- `TRADE_CARDS` - Trade cards (Pokémon Trader)
- `ATTACH_TO_POKEMON` - Attach this card to a Pokémon (Tools)

**Usage:** Used in `TrainerEffect` interfaces to define trainer card effects.

**Example:**
```typescript
trainerEffect.effectType === TrainerEffectType.DRAW_CARDS
```

---

### AttackEffectType

**Purpose:** Defines the types of effects that attacks can have.

**Values:**
- `DISCARD_ENERGY` - Discard energy from this or defending Pokémon
- `STATUS_CONDITION` - Apply status condition to defending Pokémon
- `DAMAGE_MODIFIER` - Increase or decrease attack damage
- `HEAL` - Heal damage from this or defending Pokémon
- `PREVENT_DAMAGE` - Prevent damage during next turn
- `RECOIL_DAMAGE` - This Pokémon takes recoil damage
- `ENERGY_ACCELERATION` - Attach energy from deck/discard/hand
- `SWITCH_POKEMON` - Switch this Pokémon with benched

**Usage:** Used in `AttackEffect` interfaces to define attack effects.

**Example:**
```typescript
attackEffect.effectType === AttackEffectType.STATUS_CONDITION
```

---

### ConditionType

**Purpose:** Defines conditions that must be met for effects to activate.

**Values:**

**No Condition:**
- `ALWAYS` - Effect always happens

**Coin Flip Based:**
- `COIN_FLIP_SUCCESS` - Coin flip was heads
- `COIN_FLIP_FAILURE` - Coin flip was tails

**Self (This Pokémon) Conditions:**
- `SELF_HAS_DAMAGE` - This Pokémon has any damage counters
- `SELF_NO_DAMAGE` - This Pokémon has no damage counters
- `SELF_HAS_STATUS` - This Pokémon has a status condition
- `SELF_MINIMUM_DAMAGE` - This Pokémon has at least X damage

**Opponent (Defending Pokémon) Conditions:**
- `OPPONENT_HAS_DAMAGE` - Defending Pokémon has damage
- `OPPONENT_HAS_STATUS` - Defending Pokémon has any status
- `OPPONENT_CONFUSED` - Defending Pokémon is Confused
- `OPPONENT_PARALYZED` - Defending Pokémon is Paralyzed
- `OPPONENT_POISONED` - Defending Pokémon is Poisoned
- `OPPONENT_BURNED` - Defending Pokémon is Burned
- `OPPONENT_ASLEEP` - Defending Pokémon is Asleep

**Energy Conditions:**
- `SELF_HAS_ENERGY_TYPE` - This Pokémon has specific energy type
- `SELF_MINIMUM_ENERGY` - This Pokémon has at least X energy

**Board State Conditions:**
- `OPPONENT_HAS_BENCHED` - Opponent has benched Pokémon
- `SELF_HAS_BENCHED` - Player has benched Pokémon
- `STADIUM_IN_PLAY` - A Stadium card is in play

**Usage:** Used in `Condition` interfaces to define effect preconditions.

**Example:**
```typescript
condition.conditionType === ConditionType.COIN_FLIP_SUCCESS
```

---

### CardRuleType

**Purpose:** Defines types of special rules that apply to cards. Card rules are always-on modifications to game state or restrictions on actions, different from abilities which are active effects.

**Values:**

**Movement Rules:**
- `CANNOT_RETREAT` - This Pokémon cannot retreat
- `FORCED_SWITCH` - Must switch after certain actions
- `FREE_RETREAT` - This Pokémon has no retreat cost

**Attack Rules:**
- `CANNOT_ATTACK` - This Pokémon cannot attack
- `ATTACK_COST_MODIFICATION` - Modify attack energy costs
- `ATTACK_RESTRICTION` - Restrictions on which attacks can be used

**Damage Rules:**
- `DAMAGE_IMMUNITY` - Prevent all damage from certain sources
- `DAMAGE_REDUCTION_RULE` - Reduce damage taken
- `INCREASED_DAMAGE_TAKEN` - This Pokémon takes more damage

**Status Rules:**
- `STATUS_IMMUNITY` - Cannot be affected by specific status conditions
- `EFFECT_IMMUNITY` - Cannot be affected by certain effects
- `CANNOT_BE_CONFUSED` - Specific immunity to Confusion

**Prize Rules:**
- `EXTRA_PRIZE_CARDS` - Opponent takes extra prizes when knocked out
- `NO_PRIZE_CARDS` - Opponent doesn't take prizes when knocked out

**Evolution Rules:**
- `CAN_EVOLVE_TURN_ONE` - Can evolve on first turn
- `CANNOT_EVOLVE` - This Pokémon cannot evolve
- `SKIP_EVOLUTION_STAGE` - Can skip evolution stages

**Play Rules:**
- `PLAY_RESTRICTION` - Restrictions on when/how card can be played
- `ONCE_PER_GAME` - Can only use once per game
- `DISCARD_AFTER_USE` - Card is discarded after use

**Energy Rules:**
- `ENERGY_COST_REDUCTION` - Reduce energy costs
- `EXTRA_ENERGY_ATTACHMENT` - Can attach extra energy
- `ENERGY_TYPE_CHANGE` - Change energy types

**Usage:** Used in `CardRule` interfaces to define card-specific rules.

**Example:**
```typescript
rule.ruleType === CardRuleType.CANNOT_RETREAT
```

---

### PreconditionType

**Purpose:** Defines types of preconditions for effects.

**Values:**
- `COIN_FLIP` - Requires coin flip
- `DAMAGE_CHECK` - Requires damage check
- `ENERGY_CHECK` - Requires energy check

**Usage:** Used in precondition interfaces to define what must be checked before effect execution.

**Example:**
```typescript
precondition.preconditionType === PreconditionType.COIN_FLIP
```

---

### RulePriority

**Purpose:** Defines the execution priority for card rules. When multiple rules apply simultaneously, they are evaluated in priority order: HIGHEST → HIGH → NORMAL → LOW → LOWEST.

**Values:**
- `HIGHEST` - Execute first (critical game rules that override everything else)
- `HIGH` - Execute early (important restrictions and immunities)
- `NORMAL` - Default priority (most standard rules)
- `LOW` - Execute late (minor modifications)
- `LOWEST` - Execute last (conditional bonuses that shouldn't override other rules)

**Usage:** Used in `CardRule` interfaces to determine rule resolution order.

**Example:**
```typescript
rule.priority === RulePriority.HIGHEST
```

---

### GameEventType

**Purpose:** Represents game events that can trigger various mechanics throughout the system. Can be used for ability triggers, card rule triggers, trainer card timing, effect activation, and game engine event tracking.

**Values:**
- `WHEN_PLAYED` - When this card is played from hand to the field
- `WHEN_DAMAGED` - When this Pokémon takes damage
- `WHEN_ATTACKING` - When this Pokémon declares or executes an attack
- `WHEN_DEFENDING` - When this Pokémon is the target of an attack
- `BETWEEN_TURNS` - Between the active player's turns
- `WHEN_KNOCKED_OUT` - When this Pokémon is knocked out
- `START_OF_TURN` - At the beginning of your turn
- `END_OF_TURN` - At the end of your turn

**Usage:** Used for trigger definitions in abilities, card rules, and effects.

**Example:**
```typescript
trigger.eventType === GameEventType.WHEN_PLAYED
```

---

### LegacyAbilityType

**Purpose:** Represents the original Pokémon TCG ability mechanics that have been unified into "Ability". Used for importing legacy cards, display purposes, and historical accuracy.

**Values:**
- `POKEMON_POWER` - Original mechanic from Base Set through Neo series (could be always-on or activated)
- `POKE_BODY` - Always-on passive effect from EX era (equivalent to modern PASSIVE abilities)
- `POKE_POWER` - Activated effect from EX era (equivalent to modern ACTIVATED abilities)

**Usage:** Used for legacy card import and display purposes.

**Example:**
```typescript
card.legacyAbilityType === LegacyAbilityType.POKEMON_POWER
```

---

## Match Domain Enums

### StatusEffect

**Purpose:** Represents status conditions that can affect a Pokemon during gameplay.

**Note:** This is separate from `StatusCondition` enum in card domain to maintain domain separation.

**Values:**
- `NONE` - No status condition
- `ASLEEP` - Pokémon is asleep (coin flip to wake up)
- `PARALYZED` - Pokémon is paralyzed (can't attack or retreat)
- `CONFUSED` - Pokémon is confused (coin flip to attack successfully)
- `POISONED` - Pokémon is poisoned (takes damage between turns)
- `BURNED` - Pokémon is burned (takes damage between turns, coin flip to remove)

**Usage:** Used in `CardInstance` value object to track current status. Used in game state validation.

**Example:**
```typescript
pokemon.statusEffect === StatusEffect.ASLEEP
```

---

### PokemonPosition

**Purpose:** Represents the position of a Pokemon on the field.

**Values:**
- `ACTIVE` - Active Pokémon position
- `BENCH_0` - First bench position
- `BENCH_1` - Second bench position
- `BENCH_2` - Third bench position
- `BENCH_3` - Fourth bench position
- `BENCH_4` - Fifth bench position

**Usage:** Used in `CardInstance` value object to track position. Used in action data for targeting.

**Example:**
```typescript
pokemon.position === PokemonPosition.ACTIVE
```

---

### MatchState

**Purpose:** Represents the current state of a match in the state machine.

**Values:**
- `CREATED` - Match created, no players assigned
- `WAITING_FOR_PLAYERS` - Waiting for players to join
- `DECK_VALIDATION` - Validating both player decks
- `MATCH_APPROVAL` - Waiting for players to approve match
- `PRE_GAME_SETUP` - Coin flip, determine first player
- `DRAWING_CARDS` - Drawing initial cards
- `SET_PRIZE_CARDS` - Setting prize cards
- `SELECT_ACTIVE_POKEMON` - Selecting active Pokémon
- `SELECT_BENCH_POKEMON` - Selecting bench Pokémon
- `FIRST_PLAYER_SELECTION` - Selecting first player
- `INITIAL_SETUP` - Initial game setup (shuffle, draw, set Pokemon)
- `PLAYER_TURN` - Active player's turn
- `BETWEEN_TURNS` - Processing between-turn effects
- `MATCH_ENDED` - Match completed
- `CANCELLED` - Match cancelled

**Usage:** Used in `Match` entity and `GameState` value object to track match progression.

**Example:**
```typescript
match.state === MatchState.PLAYER_TURN
```

---

### TurnPhase

**Purpose:** Represents the current phase within a player's turn.

**Values:**
- `DRAW` - Draw phase (draw one card)
- `MAIN_PHASE` - Main phase (play cards, attach energy, evolve, retreat, attack)
- `ATTACK` - Attack phase (execute attack)
- `END` - End phase (cleanup, between-turn effects)

**Usage:** Used in `GameState` value object to track turn progression. Determines which actions are valid.

**Example:**
```typescript
gameState.turnPhase === TurnPhase.MAIN_PHASE
```

---

### PlayerIdentifier

**Purpose:** Identifies which player in the match.

**Values:**
- `PLAYER1` - First player
- `PLAYER2` - Second player

**Usage:** Used throughout match domain to identify players. Used in `GameState`, actions, and validation.

**Example:**
```typescript
gameState.currentPlayer === PlayerIdentifier.PLAYER1
```

---

### PlayerActionType

**Purpose:** Represents all possible actions a player can take during a match.

**Values:**
- `DRAW_CARD` - Draw one card from deck (DRAW phase → MAIN_PHASE)
- `DRAW_INITIAL_CARDS` - Draw initial 7 cards (INITIAL_SETUP)
- `SET_PRIZE_CARDS` - Set prize cards (SET_PRIZE_CARDS)
- `PLAY_POKEMON` - Play Pokémon from hand to bench
- `SET_ACTIVE_POKEMON` - Set active Pokémon (SELECT_ACTIVE_POKEMON)
- `ATTACH_ENERGY` - Attach energy card to Pokemon
- `PLAY_TRAINER` - Play trainer card
- `EVOLVE_POKEMON` - Evolve Pokemon on bench/active
- `RETREAT` - Retreat active Pokemon
- `ATTACK` - Execute attack
- `USE_ABILITY` - Use Pokemon ability
- `GENERATE_COIN_FLIP` - Generate coin flip result
- `SELECT_PRIZE` - Select prize card (when opponent's Pokemon is knocked out)
- `DRAW_PRIZE` - Alias for SELECT_PRIZE (client compatibility)
- `END_TURN` - End current turn, switch to next player
- `COMPLETE_INITIAL_SETUP` - Complete initial setup phase
- `CONFIRM_FIRST_PLAYER` - Confirm first player selection
- `APPROVE_MATCH` - Approve match (MATCH_APPROVAL)
- `CONCEDE` - Concede match

**Usage:** Used in action execution and validation. Determines which action handlers are called.

**Example:**
```typescript
action.actionType === PlayerActionType.ATTACK
```

---

### MatchResult

**Purpose:** Represents the final result of a match.

**Values:**
- `PLAYER1_WIN` - Player 1 won
- `PLAYER2_WIN` - Player 2 won
- `DRAW` - Match ended in a draw
- `CANCELLED` - Match was cancelled

**Usage:** Used in `Match` entity when match ends. Determines winner and match outcome.

**Example:**
```typescript
match.result === MatchResult.PLAYER1_WIN
```

---

### WinCondition

**Purpose:** Represents how a match was won.

**Values:**
- `PRIZE_CARDS` - Won by taking all prize cards
- `NO_POKEMON` - Won because opponent has no Pokemon in play
- `DECK_OUT` - Won because opponent ran out of cards
- `CONCEDE` - Won because opponent conceded

**Usage:** Used in `Match` entity to track win condition. Used for match history and statistics.

**Example:**
```typescript
match.winCondition === WinCondition.PRIZE_CARDS
```

---

### CoinFlipStatus

**Purpose:** Represents the current status of a coin flip operation.

**Values:**
- `READY_TO_FLIP` - Coin flip is ready to be executed
- `FLIP_RESULT` - Coin flip result is available
- `COMPLETED` - Coin flip is completed and processed

**Usage:** Used in `CoinFlipState` value object to track coin flip progression.

**Example:**
```typescript
coinFlipState.status === CoinFlipStatus.READY_TO_FLIP
```

---

### CoinFlipContext

**Purpose:** Represents the context in which a coin flip is occurring.

**Values:**
- `ATTACK` - Coin flip for attack effect
- `STATUS_CHECK` - Coin flip for status condition check (e.g., sleep check)
- `ABILITY` - Coin flip for ability effect
- `TRAINER` - Coin flip for trainer card effect

**Usage:** Used in `CoinFlipState` value object to track why coin flip was triggered.

**Example:**
```typescript
coinFlipState.context === CoinFlipContext.ATTACK
```

---

### ActionValidationError

**Purpose:** Represents types of validation errors for player actions.

**Values:**
- `INVALID_STATE` - Action not valid in current match state
- `INVALID_PHASE` - Action not valid in current turn phase
- `NOT_PLAYER_TURN` - Not the player's turn
- `INSUFFICIENT_RESOURCES` - Player doesn't have required resources
- `INVALID_TARGET` - Invalid target for action
- `RULE_VIOLATION` - Action violates game rules
- `INVALID_ACTION` - Action type is invalid

**Usage:** Used in action validation to return specific error types.

**Example:**
```typescript
error.type === ActionValidationError.INVALID_STATE
```

---

## Tournament Domain Enums

### TournamentStatus

**Purpose:** Represents the current state of a tournament.

**Values:**
- `DRAFT` - Tournament is in draft/planning phase
- `ACTIVE` - Tournament is active and accepting matches
- `COMPLETED` - Tournament is completed
- `CANCELLED` - Tournament was cancelled

**Usage:** Used in `Tournament` entity to track tournament lifecycle.

**Example:**
```typescript
tournament.status === TournamentStatus.ACTIVE
```

---

## Usage Examples

### Card Type Checking

```typescript
// Check if card is a Pokemon
if (card.cardType === CardType.POKEMON) {
  // Access Pokemon-specific fields
  const pokemonType = card.pokemonType;
  const hp = card.hp;
}

// Check if card is a Trainer
if (card.cardType === CardType.TRAINER) {
  // Access Trainer-specific fields
  const trainerType = card.trainerType;
  const trainerEffects = card.trainerEffects;
}

// Check if card is Energy
if (card.cardType === CardType.ENERGY) {
  // Access Energy-specific fields
  const energyType = card.energyType;
  const isSpecial = card.isSpecialEnergy;
}
```

### Ability Usage Validation

```typescript
// Check if ability can be used
if (ability.activationType === AbilityActivationType.ACTIVATED) {
  // Check usage limit
  if (ability.usageLimit === UsageLimit.ONCE_PER_TURN) {
    // Check if already used this turn
    if (gameState.hasAbilityBeenUsed(playerId, cardId)) {
      throw new Error('Ability already used this turn');
    }
  }
  // Execute USE_ABILITY action
}
```

### Status Effect Handling

```typescript
// Check if Pokemon has blocking status
const blockingStatuses = [
  StatusEffect.ASLEEP,
  StatusEffect.CONFUSED,
  StatusEffect.PARALYZED,
];

if (blockingStatuses.includes(pokemon.statusEffect)) {
  // Cannot use activated abilities
  throw new Error('Cannot use ability while status condition is active');
}

// Apply status condition via ability
if (effect.effectType === AbilityEffectType.STATUS_CONDITION) {
  const statusEffect = effect.statusCondition; // StatusCondition enum
  // Convert to StatusEffect enum for CardInstance
  const matchStatusEffect = convertStatusConditionToStatusEffect(statusEffect);
  pokemon.applyStatusEffect(matchStatusEffect);
}
```

### Target Selection

```typescript
// Handle target selection based on TargetType
switch (effect.target) {
  case TargetType.SELF:
    // Target is the Pokemon using the ability
    targetPokemon = sourcePokemon;
    break;
  case TargetType.ALL_YOURS:
    // Show selection modal for all player's Pokemon
    targetPokemon = await showPokemonSelectionModal(playerPokemon);
    break;
  case TargetType.ACTIVE_OPPONENT:
    // Target is opponent's active Pokemon
    targetPokemon = opponentState.activePokemon;
    break;
}
```

### Match State Transitions

```typescript
// Check current match state
if (match.state === MatchState.PLAYER_TURN) {
  // Check turn phase
  if (gameState.turnPhase === TurnPhase.MAIN_PHASE) {
    // Allow main phase actions
    if (actionType === PlayerActionType.ATTACH_ENERGY) {
      // Execute attach energy
    }
  } else if (gameState.turnPhase === TurnPhase.ATTACK) {
    // Allow attack actions
    if (actionType === PlayerActionType.ATTACK) {
      // Execute attack
    }
  }
}
```

---

## Enum Relationships

### Card Domain Relationships

- `CardType` determines which other enums are relevant:
  - `POKEMON` → uses `PokemonType`, `EvolutionStage`, `AbilityActivationType`, `UsageLimit`
  - `TRAINER` → uses `TrainerType`, `TrainerEffectType`
  - `ENERGY` → uses `EnergyType`

- `AbilityEffectType` uses:
  - `TargetType` (for targeting)
  - `EnergySource` (for `ENERGY_ACCELERATION`)
  - `Duration` (for `PREVENT_DAMAGE`)
  - `Selector` (for card selection effects)
  - `Destination` (for `SEARCH_DECK`)
  - `StatusCondition` (for `STATUS_CONDITION`)

- `TrainerEffectType` uses:
  - `TargetType` (for targeting)
  - `Selector` (for card selection)
  - `Destination` (for search effects)

### Match Domain Relationships

- `MatchState` determines valid `PlayerActionType` values
- `TurnPhase` further restricts valid actions within `PLAYER_TURN`
- `StatusEffect` affects ability usage and attack execution
- `PokemonPosition` is used in action data for targeting
- `CoinFlipStatus` and `CoinFlipContext` work together for coin flip mechanics

### Cross-Domain Relationships

- `StatusCondition` (card domain) → `StatusEffect` (match domain)
  - Card domain defines what status can be applied
  - Match domain tracks current status on Pokemon
  - Conversion needed when applying status conditions

- `EnergyType` (card domain) matches `PokemonType` (card domain)
  - Used for type matching in energy requirements
  - Used for energy type restrictions in effects

---

## Best Practices

1. **Always use enums instead of string literals** - Provides type safety and prevents typos
2. **Use domain-appropriate enums** - Don't mix card domain and match domain enums without conversion
3. **Check enum values explicitly** - Use `===` comparisons, not string comparisons
4. **Document enum usage** - Add comments when enum values have specific meanings or restrictions
5. **Validate enum values** - When receiving data from external sources, validate enum values

---

**Last Updated:** December 2024

**Documentation Version:** 1.0

**Backend Version:** Compatible with OpenTCG Backend v1.0
