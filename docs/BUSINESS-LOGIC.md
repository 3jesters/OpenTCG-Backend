# OpenTCG Business Logic

Complete specification of game rules, mechanics, and domain logic for the OpenTCG system.

## Table of Contents

- [Domain Enums](#domain-enums)
- [Match State Machine](#match-state-machine)
- [Game Effects Specification](#game-effects-specification)
- [Status Effect Coin Flip Validation](#status-effect-coin-flip-validation)
- [Trainer Effects Source Property](#trainer-effects-source-property)

---

## Domain Enums

### Card Domain Enums

#### CardType
- `POKEMON` - Pokémon cards (creatures with attacks and abilities)
- `TRAINER` - Trainer cards (items, supporters, stadiums, tools)
- `ENERGY` - Energy cards (provide energy to power attacks)

#### PokemonType
- `FIRE`, `WATER`, `GRASS`, `ELECTRIC`, `PSYCHIC`, `FIGHTING`, `DARKNESS`, `METAL`, `FAIRY`, `DRAGON`, `COLORLESS`

#### EvolutionStage
- `BASIC`, `STAGE_1`, `STAGE_2`, `MEGA`, `VMAX`, `VSTAR`, `GX`, `EX`, `BREAK`, `LEGEND`

#### AbilityActivationType
- `PASSIVE` - Always active, no player action required
- `TRIGGERED` - Automatically activates when a specific game event occurs
- `ACTIVATED` - Player chooses to use it, often with usage limits

#### UsageLimit
- `ONCE_PER_TURN` - Can be used once per turn
- `UNLIMITED` - Can be used multiple times

#### TargetType
- `SELF` - The Pokémon using the ability/attack
- `ALL_YOURS` - All your Pokémon (active + bench)
- `ACTIVE_YOURS` - Your active Pokémon
- `BENCHED_YOURS` - Your benched Pokémon
- `ALL_OPPONENTS` - All opponent's Pokémon (active + bench)
- `ACTIVE_OPPONENT` - Opponent's active Pokémon
- `BENCHED_OPPONENTS` - Opponent's benched Pokémon
- `DEFENDING` - The defending Pokémon (target of attack)

### Match Domain Enums

#### MatchState
- `CREATED` - Match created, no players assigned
- `WAITING_FOR_PLAYERS` - Waiting for players to join
- `DECK_VALIDATION` - Validating both player decks
- `PRE_GAME_SETUP` - Coin flip, determine first player
- `DRAWING_CARDS` - Drawing initial cards
- `SET_PRIZE_CARDS` - Setting prize cards
- `SELECT_ACTIVE_POKEMON` - Selecting active Pokémon
- `SELECT_BENCH_POKEMON` - Selecting bench Pokémon
- `FIRST_PLAYER_SELECTION` - Selecting first player
- `INITIAL_SETUP` - Initial game setup (legacy state)
- `PLAYER_TURN` - Active player's turn
- `BETWEEN_TURNS` - Processing between-turn effects
- `MATCH_ENDED` - Match completed
- `CANCELLED` - Match cancelled

#### TurnPhase
- `DRAW` - Draw phase (draw one card)
- `MAIN_PHASE` - Main phase (play cards, attach energy, evolve, retreat, attack)
- `ATTACK` - Attack phase (execute attack)
- `END` - End phase (cleanup, between-turn effects)

#### StatusEffect
- `NONE` - No status condition
- `ASLEEP` - Pokémon is asleep (coin flip to wake up)
- `PARALYZED` - Pokémon is paralyzed (can't attack or retreat)
- `CONFUSED` - Pokémon is confused (coin flip to attack successfully)
- `POISONED` - Pokémon is poisoned (takes damage between turns)
- `BURNED` - Pokémon is burned (takes damage between turns, coin flip to remove)

#### PlayerActionType
- `DRAW_CARD` - Draw one card from deck
- `PLAY_POKEMON` - Play Pokémon from hand to bench
- `SET_ACTIVE_POKEMON` - Set active Pokémon
- `ATTACH_ENERGY` - Attach energy card to Pokemon
- `PLAY_TRAINER` - Play trainer card
- `EVOLVE_POKEMON` - Evolve Pokemon
- `RETREAT` - Retreat active Pokemon
- `ATTACK` - Execute attack
- `USE_ABILITY` - Use Pokemon ability
- `GENERATE_COIN_FLIP` - Generate coin flip result
- `END_TURN` - End current turn
- `COMPLETE_INITIAL_SETUP` - Complete initial setup
- `CONCEDE` - Concede match

---

## Match State Machine

### State Flow

```
CREATED
  ↓ (assign player 1)
WAITING_FOR_PLAYERS
  ↓ (assign player 2)
DECK_VALIDATION
  ↓ (decks valid)
PRE_GAME_SETUP
  ↓ (coin toss, automatic)
DRAWING_CARDS
  ↓ (both players have valid decks)
SET_PRIZE_CARDS
  ↓ (both players set prize cards)
SELECT_ACTIVE_POKEMON
  ↓ (both players selected active)
SELECT_BENCH_POKEMON
  ↓ (both players ready)
FIRST_PLAYER_SELECTION
  ↓ (both players confirm)
PLAYER_TURN
  ↓ (turn ends)
BETWEEN_TURNS
  ↓ (process effects, switch player)
PLAYER_TURN (next player)
  ↓ (win condition met)
MATCH_ENDED
```

### State Descriptions

- **CREATED**: Match created, no players assigned
- **WAITING_FOR_PLAYERS**: Waiting for players to join
- **DECK_VALIDATION**: Validating both player decks
- **PRE_GAME_SETUP**: Coin flip, determine first player
- **DRAWING_CARDS**: Players draw initial 7 cards
- **SET_PRIZE_CARDS**: Players set prize cards from their deck
- **SELECT_ACTIVE_POKEMON**: Players select active Pokemon
- **SELECT_BENCH_POKEMON**: Players optionally select bench Pokemon
- **FIRST_PLAYER_SELECTION**: Coin toss to determine first player
- **PLAYER_TURN**: Active player's turn (phases: DRAW → MAIN_PHASE → ATTACK → END)
- **BETWEEN_TURNS**: Processing between-turn effects
- **MATCH_ENDED**: Match completed
- **CANCELLED**: Match cancelled

### Turn Phases (within PLAYER_TURN)

1. **DRAW**: Draw 1 card (except first turn of first player)
2. **MAIN_PHASE**: Play cards, attach energy, evolve, retreat, attack
3. **ATTACK**: Declare and execute attack
4. **END**: End turn actions

### Win Conditions

1. **Prize Cards**: Player takes all prize cards
2. **No Pokemon**: Opponent has no Pokemon in play (active + bench)
3. **Deck Out**: Opponent cannot draw a card (deck is empty)
4. **Concede**: Opponent concedes the match

---

## Game Effects Specification

### Status Effects

#### POISONED

**Mechanics:**
- Applied when attack with STATUS_CONDITION effect (POISONED) succeeds
- Default damage: 10 HP per turn
- Special case: Nidoking's Toxic attack applies 20 HP damage per turn
- Damage is applied between turns (after each player's turn ends)
- Affects both active and bench Pokemon
- Persists until Pokemon is knocked out, retreats/switches, or is cured

**Implementation:**
- Track poison damage amount (10 or 20) per Pokemon instance
- Apply damage in `processBetweenTurnsStatusEffects()` method
- Apply to all poisoned Pokemon (active + bench) for both players
- Clear status on retreat/switch

#### CONFUSED

**Mechanics:**
- Applied when attack with STATUS_CONDITION effect (CONFUSED) succeeds (coin flip heads)
- Before attacking, confused Pokemon must flip a coin:
  - **Heads**: Attack proceeds normally, confusion status remains
  - **Tails**: Attack fails, Pokemon takes 30 self-damage, confusion status remains
- Confusion does NOT prevent attack attempts (unlike sleep/paralyze)
- Persists until Pokemon retreats/switches or is cured

**Implementation:**
- When ATTACK action is attempted on confused Pokemon, require GENERATE_COIN_FLIP action
- In GENERATE_COIN_FLIP handler: heads = proceed, tails = 30 self-damage + block attack
- Clear status on retreat/switch

#### ASLEEP

**Mechanics:**
- Applied when attack with STATUS_CONDITION effect (ASLEEP) succeeds
- Asleep Pokemon cannot attack
- At start of turn (before DRAW_CARD), asleep Pokemon must flip a coin:
  - **Heads**: Pokemon wakes up (status becomes NONE), can attack normally
  - **Tails**: Pokemon remains asleep, cannot attack this turn
- Persists until coin flip succeeds, Pokemon retreats/switches, or is cured

**Implementation:**
- At turn start, check if active Pokemon is ASLEEP
- Create coin flip state with `CoinFlipContext.STATUS_CHECK`
- Require GENERATE_COIN_FLIP action before other actions
- In ATTACK handler: Block attack if statusEffect === ASLEEP
- Clear status on retreat/switch

#### PARALYZED

**Mechanics:**
- Applied when attack with STATUS_CONDITION effect (PARALYZED) succeeds (coin flip heads)
- Paralyzed Pokemon cannot attack
- Paralyzed Pokemon cannot retreat
- Status clears automatically at end of turn (after END_TURN action)

**Implementation:**
- In ATTACK handler: Block attack if statusEffect === PARALYZED
- In RETREAT handler: Block retreat if statusEffect === PARALYZED
- At end of turn: Clear PARALYZED status (set to NONE)
- Clear status on switch (if forced switch occurs)

#### BURNED

**Mechanics:**
- Applied when attack with STATUS_CONDITION effect (BURNED) succeeds
- Burned Pokemon takes 20 HP damage per turn
- Damage is applied between turns (after each player's turn ends)
- Affects both active and bench Pokemon
- Persists until Pokemon is knocked out, retreats/switches, or is cured

**Implementation:**
- Track burned status per Pokemon instance
- Apply 20 HP damage in `processBetweenTurnsStatusEffects()` method
- Apply to all burned Pokemon (active + bench) for both players
- Clear status on retreat/switch

### Damage Modifiers

#### PLUS_DAMAGE (Energy-Based)

**Mechanics:**
- Base damage is calculated first
- Additional damage is calculated based on attached energy (not used for attack cost)
- Formula: `finalDamage = baseDamage + (energyCount * damagePerEnergy)`

**Energy Cap Enforcement:**
- Water Energy-based attacks have a cap on bonus damage
- Only the first 2 extra Water Energy (beyond attack cost) contribute to bonus damage
- Formula with cap: `bonusDamage = Math.min(extraEnergyCount, energyBonusCap) * damagePerEnergy`

**Implementation:**
- In attack damage calculation, parse attack text or use structured effects
- For Water Energy-based attacks, check if `energyBonusCap` is set
- Count Water Energy attached to attacker (excluding energy used for attack cost)
- Apply cap and calculate bonus damage
- Apply modifiers BEFORE weakness/resistance calculations

#### MINUS_DAMAGE (Damage Reduction)

**Mechanics:**
- Base damage is calculated first
- Damage is reduced based on damage counters on the attacker or defender
- Formula: `finalDamage = Math.max(0, baseDamage - (damageCounters * reductionPerCounter))`
- Damage cannot go below 0

**Implementation:**
- Detect "-" damage pattern in attack.damage
- Parse attack text to extract reduction per counter and target Pokemon
- Get damage counters from target Pokemon (each 10 HP = 1 damage counter)
- Calculate reduction and apply (minimum 0)
- Apply reduction BEFORE "+" damage bonuses and weakness/resistance calculations

#### PLUS_DAMAGE (Fixed/Coin Flip)

**Mechanics:**
- Base damage is calculated first
- Coin flip determines if bonus damage applies
- If heads: `finalDamage = baseDamage + bonusDamage`
- If tails: `finalDamage = baseDamage` (may also apply self-damage)

**Implementation:**
- In coin flip attack handler, after coin flip results are generated
- Check if attack has DAMAGE_MODIFIER effect with coin flip condition
- If heads: Apply bonus damage
- If tails: Don't apply bonus (may apply self-damage instead)

### Damage Prevention/Reduction

#### PREVENT_DAMAGE (All)

**Mechanics:**
- Applied when attack with PREVENT_DAMAGE effect succeeds
- Duration: "next_turn" (opponent's next turn) or "this_turn"
- Amount: "all" (prevent all damage) or number (prevent specific amount)
- Prevents damage from all attacks during specified duration

**Implementation:**
- Track PREVENT_DAMAGE effects in GameState
- Store turn number when effect was applied, duration and amount
- When calculating damage, check if Pokemon has active PREVENT_DAMAGE effect
- If `amount === 'all'`: Set damage to 0
- If `amount` is number: Reduce damage by that amount (min 0)
- Expire effects at end of specified duration

#### PREVENT_DAMAGE (Amount)

**Mechanics:**
- Prevents damage only if damage amount is <= threshold
- Applied after weakness/resistance calculations
- Duration: "next_turn"

**Implementation:**
- Similar to PREVENT_DAMAGE (all) but with condition
- Check damage amount after weakness/resistance
- If damage <= threshold: Prevent all damage
- If damage > threshold: Apply full damage

#### REDUCE_DAMAGE

**Mechanics:**
- Reduces incoming damage by fixed amount
- Applied after weakness/resistance calculations
- Duration: "next_turn" or conditional
- Formula: `finalDamage = Math.max(0, damage - reductionAmount)`

**Implementation:**
- Track REDUCE_DAMAGE effects in GameState
- When calculating damage (after weakness/resistance), check if Pokemon has active REDUCE_DAMAGE effect
- Reduce damage by effect amount
- Expire effects at end of specified duration

### Self-Damage Effects

**Mechanics:**
- Attacker takes damage after successful attack
- Can be fixed amount or coin flip dependent
- Applied after attack damage is dealt to defender
- May cause attacker to be knocked out

**Implementation:**
- In attack handlers, after applying damage to defender
- Check attack text or effects for self-damage
- Parse self-damage amount (fixed or from coin flip)
- Apply damage to attacker and check for knockout

### Bench Damage Effects

**Mechanics:**
- Attack deals damage to bench Pokemon in addition to (or instead of) active Pokemon
- Can target opponent's bench only, both players' benches, or attacker's own bench
- Damage is applied to all matching bench Pokemon
- Weakness/resistance may not apply to bench damage

**Implementation:**
- In attack handlers, parse attack text for bench damage pattern
- Calculate bench damage amount
- Apply to all matching bench Pokemon, check for knockouts, move to discard, re-index bench positions

### Effect Interaction Rules

#### Priority Order
1. Status effects are applied first (if from attack)
2. Damage modifiers are applied (plus damage)
3. Weakness/resistance calculations
4. Damage prevention/reduction
5. Self-damage (after defender damage)
6. Bench damage (after active damage)

#### Status Effect Interactions
- **ASLEEP + CONFUSED**: Sleep takes priority (cannot attack at all)
- **PARALYZED + CONFUSED**: Paralyze takes priority (cannot attack at all)
- **POISONED + other status**: All statuses can coexist
- **Status on retreat**: All statuses clear when Pokemon retreats

#### Damage Prevention vs Reduction
- PREVENT_DAMAGE (all) takes priority over REDUCE_DAMAGE
- Multiple REDUCE_DAMAGE effects: Additive (reduce by sum)
- PREVENT_DAMAGE (amount) + REDUCE_DAMAGE: Apply prevent first, then reduce remainder

---

## Status Effect Coin Flip Validation

### Validated Attack Patterns

#### Pattern: "Flip a coin. If heads, the Defending Pokémon is now [Status]."

**Examples:**
- Confuse Ray: "Flip a coin. If heads, the Defending Pokémon is now Confused." (damage: 10)
- Thunder Wave: "Flip a coin. If heads, the Defending Pokémon is now Paralyzed." (damage: 30)
- Sing: "Flip a coin. If heads, the Defending Pokémon is now Asleep." (damage: 0)
- Poison Sting: "Flip a coin. If heads, the Defending Pokémon is now Poisoned." (damage: 20)

**Behavior:**
- ✅ Damage always applies regardless of coin flip result
- ✅ Status effect only applies if coin flip is heads
- ✅ Uses `STATUS_EFFECT_ONLY` damage calculation type

#### Pattern: "Flip a coin. If heads, [Status1]; if tails, [Status2]."

**Examples:**
- Foul Gas / Sludge: "Flip a coin. If heads, the Defending Pokémon is now Poisoned; if tails, it is now Confused." (damage: 10, 30)

**Behavior:**
- ✅ Damage always applies
- ✅ Status effect depends on coin flip result (heads = Poisoned, tails = Confused)
- ✅ Uses `STATUS_EFFECT_ONLY` damage calculation type

### Implementation Details

**Parser Logic:**
- Identifies status effect coin flips using pattern matching
- Checks for "flip a coin" and status condition keywords

**Damage Calculation:**
- For `STATUS_EFFECT_ONLY`: Always returns `baseDamage` regardless of coin flip result
- `shouldAttackProceed()`: Always returns `true` (attack always proceeds)

**Status Effect Application:**
- Status effects are applied based on `evaluateEffectConditions()`
- `COIN_FLIP_SUCCESS`: Checks if any flip is heads
- `COIN_FLIP_FAILURE`: Checks if any flip is tails

---

## Trainer Effects Source Property

### Overview

The `source` property in trainer effect metadata indicates **where cards come from** when they are selected, retrieved, or moved by a trainer card effect.

### Possible Source Values

| Value | Description | Client UI Action |
|-------|-------------|------------------|
| `"HAND"` | Cards from the player's hand | Show hand selection modal |
| `"DISCARD"` | Cards from the player's discard pile | Show discard pile modal |
| `"OPPONENT_DISCARD"` | Cards from the opponent's discard pile | Show opponent's discard pile modal |
| `"DECK"` | Cards from the player's deck | Show deck search/browse modal |

### When Source is Required vs Optional

#### Required (Must Have Source)
- **`EVOLVE_POKEMON`** - Evolution card must come from hand
- **`PUT_INTO_PLAY`** - Card must come from hand, discard, or opponent's discard

#### Optional (Defaults Apply)
- **`RETRIEVE_FROM_DISCARD`** - Defaults to `"DISCARD"` (player's discard)
- **`RETRIEVE_ENERGY`** - Defaults to `"DISCARD"` (player's discard)
- **`SEARCH_DECK`** - Defaults to `"DECK"` (player's deck)

### Effect Types That Use Source

#### EVOLVE_POKEMON
- **Source Values:** `"HAND"` (required)
- Evolution card comes from player's hand

#### PUT_INTO_PLAY
- **Source Values:** `"HAND"`, `"DISCARD"`, `"OPPONENT_DISCARD"`
- Card is played from hand, discard, or opponent's discard

#### RETRIEVE_FROM_DISCARD
- **Source Values:** `"DISCARD"` (default), `"OPPONENT_DISCARD"` (future use)
- Retrieve cards from discard pile to hand

#### RETRIEVE_ENERGY
- **Source Values:** `"DISCARD"` (default)
- Retrieve energy cards from discard pile to hand

#### SEARCH_DECK
- **Source Values:** `"DECK"` (default)
- Search deck for specific cards

### Default Behavior Summary

| Effect Type | Default Source | Notes |
|-------------|----------------|-------|
| `EVOLVE_POKEMON` | **Required** | Must specify `source: "HAND"` |
| `PUT_INTO_PLAY` | **Required** | Must specify source (HAND, DISCARD, or OPPONENT_DISCARD) |
| `RETRIEVE_FROM_DISCARD` | `"DISCARD"` | Player's discard pile |
| `RETRIEVE_ENERGY` | `"DISCARD"` | Player's discard pile |
| `SEARCH_DECK` | `"DECK"` | Player's deck |

---

**Last Updated:** December 2024

