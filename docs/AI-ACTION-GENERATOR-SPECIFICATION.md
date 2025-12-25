# AI Action Generator Service Specification

## Overview

The AI Action Generator Service is responsible for analyzing the current game state and generating an optimal `ExecuteActionDto` for AI players. The service implements a strategic decision-making algorithm that evaluates multiple factors including Pokemon scoring, opponent threat assessment, trainer card prioritization, and action sequencing.

## Input/Output

### Input
- `match: Match` - The current match state (domain entity)
- `playerId: string` - The AI player ID
- `playerIdentifier: PlayerIdentifier` - The player identifier (PLAYER1 or PLAYER2)

### Output
- `ExecuteActionDto` - Contains:
  - `matchId: string`
  - `playerId: string`
  - `actionType: PlayerActionType`
  - `actionData: Record<string, unknown>` - Action-specific data

## Core Algorithm Components

### 1. Pokemon Scoring Algorithm

**Purpose**: Evaluate the strategic value of each Pokemon card to prioritize which Pokemon to play, evolve, or protect.

**Formula**:
```
PokemonScore = maxHP + sum(attackScore) for all attacks

Where for each attack:
  attackScore = (maxHP / energyCost) + sideEffectPoints
  
  energyCost = number of energy cards required for the attack
  sideEffectPoints = 
    - If attack has coin flip: damage / 2
    - If attack has no coin flip: damage
    - If attack has only side effect and no damage: use default damage of 10
    - If attack has poison effect: use default damage of 20
```

**Implementation Notes**:
- `maxHP` represents the Pokemon's maximum hit points (survivability)
- `maxHP / energyCost` represents damage efficiency (damage per energy invested)
- Side effect points account for attack reliability (coin flips reduce expected value)
- For attacks with only side effects (no damage value), use default damage of 10
- For attacks with poison effects, use default damage of 20
- Higher scores indicate more valuable Pokemon

**Usage**:
- Score all Pokemon in player's deck, hand, and bench
- Score all Pokemon in opponent's hand and bench
- Sort by score (high to low) for prioritization

### 2. Trainer Card Categorization

**Purpose**: Organize trainer cards by effect type for strategic prioritization.

**Categories** (in priority order, highest to lowest):
1. **Healing & Damage Removal** (`HEAL`, `CURE_STATUS`)
2. **Damage Modification** (`INCREASE_DAMAGE`, `REDUCE_DAMAGE`)
3. **Card Drawing & Deck Manipulation** (`DRAW_CARDS`, `SEARCH_DECK`, `LOOK_AT_DECK`)
4. **Card Discard & Retrieval** (`RETRIEVE_FROM_DISCARD`, `RETRIEVE_ENERGY`)
5. **Opponent Manipulation** (`OPPONENT_DRAWS`, `OPPONENT_SHUFFLES_HAND`, `OPPONENT_DISCARDS`)
6. **Pokemon Manipulation** (`SWITCH_ACTIVE`, `RETURN_TO_HAND`, `FORCE_SWITCH`, `EVOLVE_POKEMON`, `PUT_INTO_PLAY`)
7. **Energy Manipulation** (`REMOVE_ENERGY`, `DISCARD_ENERGY`)
8. **Special Effects** (`TRADE_CARDS`, `ATTACH_TO_POKEMON`)

**Multi-Effect Cards**:
- If a trainer card has multiple trainer effects, ignore these effects when categorizing:
  - `DISCARD_HAND`
  - `SHUFFLE_DECK`
  - `DISCARD_ENERGY`
  - `ATTACH_TO_POKEMON`
  - `DEVOLVE_POKEMON`
  - `OPPONENT_DISCARDS`
- Use the card but only consider non-ignored effects for prioritization
- Categorize based on the highest priority non-ignored effect

### 3. Opponent Analysis

**Purpose**: Assess opponent's threat level and potential actions.

#### 3.1 Sure Attack Damage
- Calculate the maximum damage the opponent's active Pokemon can deal **without playing any cards**
- Consider:
  - Current attached energy
  - Available attacks with sufficient energy
  - Base damage (no coin flips, no energy attachments)
  - Damage modifiers (weakness, resistance)

#### 3.2 Risk Attack Damage
- Calculate the maximum damage the opponent could potentially deal
- Consider:
  - Sure attack damage (baseline)
  - Coin flip bonuses (assume heads for maximum damage)
  - Potential energy attachments this turn (if opponent has energy in hand)
  - Damage bonuses from energy-based attacks
  - All possible attack targets (active Pokemon and bench Pokemon)

#### 3.3 Opponent Pokemon Scoring
- Score all Pokemon the opponent has in hand and bench using the Pokemon scoring algorithm
- Sort by score (high to low)
- Identify the opponent's most valuable Pokemon (highest threat)

### 4. Player State Analysis

**Purpose**: Determine current game state and available actions.

#### 4.1 State Detection
- Determine current match state and turn phase
- Get available actions using `AvailableActionsService`
- **Early Return Rule**: If only one available action (e.g., `DRAW_CARD`, `END_TURN`), immediately return that action

#### 4.2 Action Prioritization (Main Phase)

When in `MAIN_PHASE` with multiple available actions, create these state variables:

##### A. Available Attacks Analysis
For each active/bench Pokemon:
- Find the attack with the highest damage that has sufficient energy cards attached
- Check if the attack has side effects (removes energy, causes other effects)
- Sort all possibilities by:
  1. Pokemon position (active first, then bench)
  2. Damage amount (highest first)
  3. Side effects (attacks without self-side effects preferred)

##### B. Knockout Potential Analysis
For the current state (without playing any cards, only attacking):
- Check if any available attack can knockout an opponent Pokemon:
  - First check active Pokemon
  - Then check bench Pokemon
- For each knockout-capable attack, mark:
  - Whether it's from active or bench Pokemon
  - Whether it has side effects (to opponent or player)
- Create two lists:
  1. **Knockout Attacks** (prioritized):
     - Active Pokemon attacks first, then bench
     - Attacks with side effects to opponent preferred over no side effects
     - Attacks with no side effects to player preferred over side effects to player
  2. **Maximum Damage Attacks** (prioritized same way):
     - Attacks that deal the most damage (even if not knockout)

##### C. Opponent Threat Assessment
- Check if the opponent can knockout any of our Pokemon (active or bench) in the next turn
- Consider:
  - Opponent's sure attack damage
  - Opponent's risk attack damage
  - Current HP of our Pokemon
- This assessment is done **without** considering trainer cards we might play

### 5. Energy Attachment Prioritization

**Purpose**: Determine which energy card to attach and to which Pokemon.

**Process**:
1. For each unique energy type in hand (without duplications):
   - Example: If hand has 2 Water Energy and 1 Fire Energy, check 1 Water and 1 Fire

2. **If knockout attacks list is empty** (we cannot knockout opponent):
   - For each energy type, evaluate attachment to each Pokemon:
     - Check if attaching this energy will:
       - Improve the amount of damage we can deal
       - Enable a knockout attack
     - Prioritize energy attachments that:
       - Do not cause "overflow" (prefer exact match)
       - Example: Pokemon needs [Water, Colorless], currently has [Water]
         - If hand has [Water, DoubleColorless]:
           - Prefer Water (exact match, no overflow)
           - Only prefer DoubleColorless if Pokemon requires multiple DoubleColorless energies
     - Sort by:
       1. Enables knockout (highest priority)
       2. Increases damage potential
       3. No energy overflow (exact match preferred)

### 6. Trainer Card Usage Prioritization

**Purpose**: Determine which trainer cards to play and in what order.

**Process**:
1. For each unique trainer card type in hand (without duplications)

2. **General Rules**:
   - If trainer card has no side effects (only adds, doesn't remove cards):
     - Always play it (unless it would cause deck to reach 0 cards, which means we lose)
   - If trainer card would cause deck to reach 0 cards: **DO NOT PLAY**

3. **Healing Cards** (`HEAL`, `CURE_STATUS`):
   - Priority order:
     1. Active Pokemon first
     2. Then bench Pokemon (sorted by Pokemon score, highest first)
   - Play healing if:
     - Pokemon has damage greater than the amount we can heal
     - After healing, remaining HP < opponent's sure attack damage
     - This prevents a knockout that would otherwise occur

4. **Damage Modification Cards**:
   - `INCREASE_DAMAGE` (e.g., PlusPower):
     - Play if it would cause a Pokemon to be knocked out that wouldn't be knocked out otherwise
   - `REDUCE_DAMAGE` (e.g., Defender):
     - Play if it would prevent our Pokemon from being knocked out due to sure damage
     - Only if the Pokemon would be knocked out without the card

5. **Opponent Manipulation Cards**:
   - For each trainer card, check if playing it would:
     - Change opponent's sure attack damage
     - Enable/disable a knockout of opponent
     - Prevent our Pokemon from being knocked out
   - **Energy Removal** (`REMOVE_ENERGY` from opponent):
     - Always target the Pokemon with the highest sure attack damage
     - Prefer to have opponent's active Pokemon be the one with:
       - Lowest Pokemon score
       - Fewest sure attack damage
   - **Hand Manipulation** (cards that affect opponent's hand):
     - Always use it unless it causes opponent to have more cards in hand than they would have without playing the card

6. **Evaluation Method**:
   - Use heuristics/rules to estimate impact (not full simulation)
   - Consider:
     - Current game state
     - Opponent's sure/risk attack damage
     - Pokemon HP values
     - Energy attachments
     - Card counts (hand, deck, discard)

## Action Selection Flow

```
1. Get available actions
   └─> If only one action: return it immediately

2. Analyze opponent
   ├─> Calculate sure attack damage
   ├─> Calculate risk attack damage
   └─> Score opponent Pokemon

3. Analyze player state
   ├─> Score all player Pokemon
   ├─> Find available attacks
   ├─> Find knockout-capable attacks
   └─> Assess opponent threat to our Pokemon

4. Prioritize actions (if in MAIN_PHASE):
   ├─> If knockout attacks available:
   │   └─> Select best knockout attack (active > bench, no self-side effects preferred)
   │
   ├─> Else if opponent can knockout us:
   │   ├─> Try healing (active > bench by score)
   │   ├─> Try damage reduction (Defender)
   │   └─> Try energy removal from opponent
   │
   ├─> Else if energy attachments can enable knockout:
   │   └─> Attach energy (prefer exact match, no overflow)
   │
   ├─> Else if trainer cards can improve situation:
   │   ├─> Play healing cards (if needed)
   │   ├─> Play damage modification (if enables/prevents knockout)
   │   ├─> Play card drawing (if no side effects)
   │   └─> Play opponent manipulation (if beneficial)
   │
   └─> Else:
       └─> Attach energy to best Pokemon (by score)
       └─> Or play Pokemon to bench
       └─> Or evolve Pokemon
       └─> Or end turn
```

## Implementation Considerations

### Services to Use
- `AvailableActionsService` - Get available actions
- `AttackEnergyValidatorService` - Check if attacks can be performed
- `AttackDamageCalculationService` - Calculate damage
- `TrainerEffectExecutorService` - Understand trainer effects
- Card repository/services - Load card entities for analysis

### Performance
- Cache Pokemon scores (recalculate only when relevant state changes)
- Limit deep analysis (don't simulate every possible combination)
- Use heuristics for quick decisions when possible

### Edge Cases
- Empty hand
- Empty deck (lose condition)
- No active Pokemon
- All Pokemon knocked out
- Opponent has no active Pokemon

## Priority Summary

**Highest Priority Actions**:
1. Actions that result in immediate knockout of opponent
2. Actions that prevent our Pokemon from being knocked out
3. Energy attachments that enable knockout attacks
4. Trainer cards that enable/prevent knockouts

**Medium Priority Actions**:
1. Healing Pokemon that are at risk
2. Attaching energy to improve damage output
3. Playing Pokemon to bench
4. Evolving Pokemon

**Low Priority Actions**:
1. Drawing cards (if no immediate threat)
2. Playing trainer cards for card advantage
3. Ending turn (when no better actions available)

