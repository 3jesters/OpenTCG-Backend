# Card Rules System

## Overview

The Card Rules system handles special restrictions, modifications, and exceptions that apply to trading cards. Card rules are **always-on modifications** to game state or restrictions on actions, distinct from abilities which are active effects.

Card rules represent the printed text on cards like:
- "This Pokémon can't retreat"
- "When Knocked Out, your opponent takes 2 Prize cards"
- "This Pokémon can't be affected by Special Conditions"

---

## Core Concepts

### What are Card Rules?

Card rules are **passive, persistent conditions** that modify how a card behaves in the game. They differ from abilities in key ways:

| Feature | Card Rules | Abilities |
|---------|-----------|-----------|
| **Activation** | Always active (passive) | Can be activated, triggered, or passive |
| **Purpose** | Restrictions & modifications | Active effects & actions |
| **Examples** | "Can't retreat", "+2 prizes when KO'd" | "Draw 2 cards", "Heal 20 damage" |
| **Implementation** | Conditional checks in game logic | Effect execution system |

### Integration with Condition System

Card rules leverage the **Generic Condition System** to specify when they apply:
- Rules can be always active
- Rules can be conditional (e.g., "only when damaged")
- Multiple conditions can be combined

---

## Card Rule Structure

```typescript
class CardRule {
  ruleType: CardRuleType;      // Type of rule
  text: string;                 // Human-readable description
  conditions?: Condition[];     // When rule applies
  priority: RulePriority;       // Execution order
  metadata?: RuleMetadata;      // Additional rule-specific data
}
```

---

## Rule Categories

### 1. Movement Rules

Rules that affect Pokémon movement and retreat.

#### CANNOT_RETREAT
**Description:** This Pokémon cannot retreat from the Active position.

**Example:**
```typescript
CardRuleFactory.cannotRetreat();
// "This Pokémon can't retreat"
```

**Real Cards:**
- Sudowoodo (Neo Genesis) - "This Pokémon can't retreat"
- Fossil Pokémon - "This Pokémon can't retreat"

#### FREE_RETREAT
**Description:** This Pokémon has no retreat cost.

**Example:**
```typescript
CardRuleFactory.freeRetreat();
// "This Pokémon's Retreat Cost is 0"
```

#### FORCED_SWITCH
**Description:** Must switch after certain actions.

**Example:**
```typescript
CardRuleFactory.forcedSwitch('benched');
// "After this Pokémon attacks, switch it with 1 of your Benched Pokémon"
```

---

### 2. Attack Rules

Rules that modify or restrict attacks.

#### CANNOT_ATTACK
**Description:** This Pokémon cannot attack.

**Example:**
```typescript
CardRuleFactory.cannotAttack();
// "This Pokémon can't attack"
```

#### ATTACK_COST_MODIFICATION
**Description:** Modify attack energy costs.

**Example:**
```typescript
// Simple cost reduction
CardRuleFactory.attackCostReduction(1);
// "This Pokémon's attacks cost 1 less Energy"

// Conditional cost reduction
CardRuleFactory.attackCostReduction(
  1,
  [ConditionFactory.selfHasDamage()],
  'per damage counter'
);
// "This Pokémon's attacks cost 1 less Energy per damage counter on it"
```

**Real Cards:**
- Typhlosion (HGSS) - "Each of your Fire Pokémon's attacks cost 1 less Energy"
- Magnezone (Plasma Storm) - "Lightning Pokémon's attacks cost 1 less Energy"

#### ATTACK_RESTRICTION
**Description:** Restrictions on which attacks can be used.

**Metadata:**
```typescript
{
  category: 'attack',
  affectedAttacks?: string[]  // Specific attack names
}
```

---

### 3. Damage Rules

Rules that modify damage calculation.

#### DAMAGE_IMMUNITY
**Description:** Prevent all damage from certain sources.

**Example:**
```typescript
CardRuleFactory.damageImmunity('Pokémon-EX');
// "Prevent all damage done to this Pokémon by attacks from Pokémon-EX"
```

**Real Cards:**
- Giratina (Plasma Freeze) - "Prevent all damage done to this Pokémon by attacks from Pokémon-EX"
- Sigilyph (Dragons Exalted) - "Prevent all damage done to this Pokémon by attacks from Basic Pokémon"

#### DAMAGE_REDUCTION_RULE
**Description:** Reduce damage taken by a fixed amount.

**Example:**
```typescript
CardRuleFactory.damageReduction(20);
// "This Pokémon takes 20 less damage from attacks"
```

**Real Cards:**
- Lucario (Boundaries Crossed) - "Any damage done to this Pokémon by attacks is reduced by 20"
- Steel-type Pokémon - Often have damage reduction abilities

#### INCREASED_DAMAGE_TAKEN
**Description:** This Pokémon takes more damage.

**Metadata:**
```typescript
{
  category: 'damage',
  increaseAmount?: number
}
```

---

### 4. Status Rules

Rules about status conditions and effects.

#### STATUS_IMMUNITY
**Description:** Cannot be affected by specific status conditions.

**Example:**
```typescript
CardRuleFactory.statusImmunity(['PARALYZED', 'POISONED', 'BURNED']);
// "This Pokémon can't be affected by PARALYZED, POISONED, BURNED"
```

**Real Cards:**
- Keldeo-EX (Boundaries Crossed) - "This Pokémon can't be affected by Special Conditions"

#### EFFECT_IMMUNITY
**Description:** Cannot be affected by certain effects.

**Example:**
```typescript
CardRuleFactory.effectImmunity();
// "Prevent all effects of attacks, except damage, done to this Pokémon"
```

**Real Cards:**
- Bouffalant (Dragons Exalted) - "Prevent all effects of attacks, including damage, done to this Pokémon by Pokémon-EX"

#### CANNOT_BE_CONFUSED
**Description:** Specific immunity to Confusion.

---

### 5. Prize Rules

Rules about Prize cards.

#### EXTRA_PRIZE_CARDS
**Description:** Opponent takes extra prizes when this Pokémon is knocked out.

**Example:**
```typescript
CardRuleFactory.extraPrizeCards(2);
// "When this Pokémon is Knocked Out, your opponent takes 2 more Prize cards"

CardRuleFactory.extraPrizeCards(3);
// VMAX Pokémon - 3 prize cards
```

**Real Cards:**
- Pokémon-GX: +1 Prize card
- Pokémon-EX: +1 Prize card
- Pokémon VMAX: +3 Prize cards
- Pokémon V: +2 Prize cards

#### NO_PRIZE_CARDS
**Description:** Opponent doesn't take prizes when knocked out.

**Example:**
```typescript
CardRuleFactory.noPrizeCards();
// "If this Pokémon is Knocked Out, your opponent doesn't take any Prize cards"
```

---

### 6. Evolution Rules

Rules about evolution.

#### CAN_EVOLVE_TURN_ONE
**Description:** Can evolve on first turn or the turn it was played.

**Example:**
```typescript
CardRuleFactory.canEvolveTurnOne();
// "This Pokémon can evolve during your first turn or the turn it was played"
```

**Real Cards:**
- Broken Time-Space (Stadium) - "Each player can evolve Pokémon the first turn they are in play"

#### CANNOT_EVOLVE
**Description:** This Pokémon cannot evolve.

**Example:**
```typescript
CardRuleFactory.cannotEvolve();
// "This Pokémon can't evolve"
```

#### SKIP_EVOLUTION_STAGE
**Description:** Can skip evolution stages.

**Metadata:**
```typescript
{
  category: 'evolution',
  skipStages?: number
}
```

---

### 7. Play Rules

Rules about card usage and play restrictions.

#### PLAY_RESTRICTION
**Description:** Restrictions on when/how card can be played.

**Metadata:**
```typescript
{
  category: 'play',
  restriction?: string  // "first turn", etc.
}
```

#### ONCE_PER_GAME
**Description:** Can only use once per game.

**Example:**
```typescript
CardRuleFactory.oncePerGame();
// "You can use this only once per game"
```

**Real Cards:**
- All GX attacks
- VMAX attacks (some)

#### DISCARD_AFTER_USE
**Description:** Card is discarded after use.

**Example:**
```typescript
CardRuleFactory.discardAfterUse();
// "Discard this card after you use it"
```

**Real Cards:**
- Many Trainer cards (Items, Supporters)

---

### 8. Energy Rules

Rules about energy attachment and costs.

#### ENERGY_COST_REDUCTION
**Description:** Reduce energy costs.

**Example:**
```typescript
// General reduction
CardRuleFactory.energyCostReduction(1);
// "This Pokémon's attacks cost 1 less Energy"

// Type-specific reduction
CardRuleFactory.energyCostReduction(1, EnergyType.FIRE);
// "This Pokémon's attacks cost 1 less Fire Energy"
```

**Real Cards:**
- Various support Pokémon
- Stadium cards

#### EXTRA_ENERGY_ATTACHMENT
**Description:** Can attach extra energy.

**Example:**
```typescript
CardRuleFactory.extraEnergyAttachment(2);
// "You may attach 2 extra Energy cards to this Pokémon during your turn"
```

**Real Cards:**
- Venusaur (EX FireRed & LeafGreen) - "Once during your turn, you may attach 2 Energy cards from your hand to 1 of your Pokémon"

#### ENERGY_TYPE_CHANGE
**Description:** Change energy types.

**Example:**
```typescript
CardRuleFactory.energyTypeChange(EnergyType.FIRE);
// "All Energy attached to this Pokémon are Fire Energy"
```

**Real Cards:**
- Rainbow Energy (all sets) - "Provides every type of Energy but only 1 Energy at a time"

---

## Rule Priority System

Rules are evaluated in priority order to ensure consistent game state:

### Priority Levels

| Priority | Value | When to Use | Example Rules |
|----------|-------|-------------|---------------|
| **HIGHEST** | 5 | Critical game rules that override everything | Once per game restrictions |
| **HIGH** | 4 | Important restrictions and immunities | Cannot retreat, damage immunity |
| **NORMAL** | 3 | Most standard rules (default) | Energy cost modifications |
| **LOW** | 2 | Minor modifications | Small adjustments |
| **LOWEST** | 1 | Conditional bonuses | Situational reductions |

### Priority Sorting

```typescript
// Get rules sorted by priority (highest first)
const sortedRules = card.getRulesByPriority();

// Rules are evaluated in order: HIGHEST → HIGH → NORMAL → LOW → LOWEST
```

### Why Priority Matters

When multiple rules apply simultaneously:
1. **Immunities** (HIGH) are checked before **cost reductions** (NORMAL)
2. **Restrictions** (HIGH/HIGHEST) override **modifications** (NORMAL/LOW)
3. **Once per game** (HIGHEST) prevents duplicate usage

**Example:**
```typescript
// Card has multiple rules
card.setCardRules([
  CardRuleFactory.attackCostReduction(1),      // NORMAL (3)
  CardRuleFactory.oncePerGame(),               // HIGHEST (5)
  CardRuleFactory.damageImmunity('Pokémon-EX'), // HIGH (4)
]);

// Game engine processes in priority order:
// 1. Once per game check (HIGHEST)
// 2. Damage immunity check (HIGH)
// 3. Cost reduction calculation (NORMAL)
```

---

## Validation Rules

### Required Fields
- `ruleType`: Must be a valid CardRuleType enum value
- `text`: Cannot be empty or whitespace-only
- `priority`: Must be a valid RulePriority enum value

### Metadata Validation

Each rule category has specific metadata requirements:

#### Prize Rules
- `prizeCount` must be ≥ 0
- `prizeCount` cannot be negative

#### Attack Rules
- `costReduction` cannot be negative
- `costIncrease` cannot be negative
- `affectedAttacks` must be an array (if provided)

#### Damage Rules
- `reductionAmount` cannot be negative
- `increaseAmount` cannot be negative
- `immuneFrom` must be an array (if provided)

#### Energy Rules
- `costReduction` cannot be negative
- `extraAttachments` must be ≥ 1

---

## Usage Examples

### Basic Usage

```typescript
import { Card, CardRuleFactory, ConditionFactory } from './domain';

// Create a Pokémon VMAX
const charizardVMAX = new Card(/*...*/);
charizardVMAX.setCardRules([
  CardRuleFactory.extraPrizeCards(3)
]);

// Create rooted Pokémon
const sudowoodo = new Card(/*...*/);
sudowoodo.setCardRules([
  CardRuleFactory.cannotRetreat()
]);

// Check if card can retreat
if (!sudowoodo.canRetreat()) {
  console.log("This Pokémon can't retreat!");
}
```

### Conditional Rules

```typescript
// Energy cost reduction when damaged
const typhlosion = new Card(/*...*/);
typhlosion.setCardRules([
  CardRuleFactory.attackCostReduction(
    1,
    [ConditionFactory.selfHasDamage()],
    'per damage counter'
  )
]);

// Status immunity when certain condition is met
const keldeo = new Card(/*...*/);
keldeo.setCardRules([
  CardRuleFactory.statusImmunity(['PARALYZED', 'POISONED', 'BURNED'])
]);
```

### Multiple Rules

```typescript
// Complex Pokémon with multiple rules
const legendaryPokemon = new Card(/*...*/);
legendaryPokemon.setCardRules([
  CardRuleFactory.extraPrizeCards(2),
  CardRuleFactory.statusImmunity(['PARALYZED']),
  CardRuleFactory.damageReduction(20),
  CardRuleFactory.oncePerGame()
]);

// Query rules
console.log(legendaryPokemon.hasRules()); // true
console.log(legendaryPokemon.getRulesByType(CardRuleType.EXTRA_PRIZE_CARDS));
console.log(legendaryPokemon.getRulesByPriority());
```

### Checking Rule Types

```typescript
// Check if card has specific rule type
if (card.hasRuleType(CardRuleType.DAMAGE_IMMUNITY)) {
  console.log('This Pokémon has damage immunity!');
}

// Get all rules of a specific type
const prizeRules = card.getRulesByType(CardRuleType.EXTRA_PRIZE_CARDS);
```

---

## Real Pokémon Card Examples

### Example 1: Pokémon VMAX (Charizard VMAX)
```typescript
const charizardVMAX = new Card(
  '550e8400-e29b-41d4-a716-446655440001',
  'swsh-020-charizard-vmax',
  '006',
  'Charizard VMAX',
  'Champion\'s Path',
  '020/073',
  Rarity.ULTRA_RARE,
  CardType.POKEMON,
  'The extremely high temperatures of its body',
  'aky CG Works',
  '/images/charizard-vmax.png'
);

charizardVMAX.setPokemonType(PokemonType.FIRE);
charizardVMAX.setStage(EvolutionStage.VMAX);
charizardVMAX.setHp(330);
charizardVMAX.setCardRules([
  CardRuleFactory.extraPrizeCards(3)
]);
// Rule text: "When this Pokémon is Knocked Out, your opponent takes 3 more Prize cards"
```

### Example 2: Giratina (Anti-EX)
```typescript
const giratina = new Card(/*...*/);
giratina.setPokemonType(PokemonType.PSYCHIC);
giratina.setHp(100);
giratina.setCardRules([
  CardRuleFactory.damageImmunity('Pokémon-EX')
]);
// Rule text: "Prevent all damage done to this Pokémon by attacks from Pokémon-EX"
```

### Example 3: Sudowoodo (Rooted)
```typescript
const sudowoodo = new Card(/*...*/);
sudowoodo.setPokemonType(PokemonType.FIGHTING);
sudowoodo.setHp(70);
sudowoodo.setCardRules([
  CardRuleFactory.cannotRetreat()
]);
// Rule text: "This Pokémon can't retreat"

// Game logic check
if (!sudowoodo.canRetreat()) {
  // Prevent retreat action
}
```

### Example 4: Keldeo-EX (Status Immunity)
```typescript
const keldeoEX = new Card(/*...*/);
keldeoEX.setPokemonType(PokemonType.WATER);
keldeoEX.setHp(170);
keldeoEX.setCardRules([
  CardRuleFactory.extraPrizeCards(1),
  CardRuleFactory.statusImmunity(['PARALYZED', 'POISONED', 'BURNED', 'ASLEEP', 'CONFUSED'])
]);
// Rule text: "This Pokémon can't be affected by Special Conditions"
```

### Example 5: Conditional Energy Reduction
```typescript
const typhlosion = new Card(/*...*/);
typhlosion.setPokemonType(PokemonType.FIRE);
typhlosion.setHp(140);
typhlosion.setCardRules([
  CardRuleFactory.attackCostReduction(
    1,
    [ConditionFactory.selfHasDamage()],
    'per damage counter'
  )
]);
// Rule text: "This Pokémon's attacks cost 1 less Energy for each damage counter on it"
```

---

## Integration with Game Engine

### Rule Evaluation Flow

```
1. Player attempts action (attack, retreat, etc.)
   ↓
2. Game engine checks card rules by priority
   ↓
3. HIGHEST priority rules evaluated first
   ↓
4. If restriction rule blocks action → action fails
   ↓
5. If modification rule applies → adjust parameters
   ↓
6. Continue to LOWER priority rules
   ↓
7. Execute action with all modifications applied
```

### Checking Rules in Game Logic

```typescript
// Check if action is allowed
function canPokemonRetreat(pokemon: Card): boolean {
  if (!pokemon.isPokemonCard()) {
    return false;
  }
  
  // Check CANNOT_RETREAT rule
  if (pokemon.hasRuleType(CardRuleType.CANNOT_RETREAT)) {
    return false;
  }
  
  // Check FREE_RETREAT rule
  if (pokemon.hasRuleType(CardRuleType.FREE_RETREAT)) {
    return true;
  }
  
  // Normal retreat cost logic
  return true;
}

// Apply rule modifications
function calculateAttackCost(pokemon: Card, attack: Attack): number {
  let cost = attack.energyCost.length;
  
  // Get cost modification rules
  const costRules = pokemon.getRulesByType(CardRuleType.ATTACK_COST_MODIFICATION);
  
  for (const rule of costRules) {
    // Check if rule applies (conditions)
    if (isRuleActive(rule, gameState)) {
      const metadata = rule.metadata as AttackRuleMetadata;
      cost -= metadata.costReduction || 0;
    }
  }
  
  return Math.max(0, cost); // Cost cannot go below 0
}
```

---

## Best Practices

### 1. Use Factory Methods
Always use `CardRuleFactory` methods instead of creating rules manually:
```typescript
// ✅ Good
const rule = CardRuleFactory.cannotRetreat();

// ❌ Avoid
const rule = new CardRule(CardRuleType.CANNOT_RETREAT, "Text", ...);
```

### 2. Set Appropriate Priorities
Choose priority based on rule importance:
- **HIGHEST**: Game-breaking restrictions (once per game)
- **HIGH**: Hard restrictions (cannot attack, immunities)
- **NORMAL**: Standard modifications (most rules)
- **LOW**: Minor adjustments

### 3. Use Conditions for Dynamic Rules
Leverage the Condition System for rules that apply situationally:
```typescript
CardRuleFactory.attackCostReduction(
  1,
  [ConditionFactory.selfHasDamage()]
);
```

### 4. Validate Before Setting
Rules are automatically validated, but handle errors appropriately:
```typescript
try {
  card.setCardRules([rule1, rule2]);
} catch (error) {
  console.error('Invalid rule:', error.message);
}
```

### 5. Query Rules Efficiently
Use helper methods instead of manual iteration:
```typescript
// ✅ Good
if (card.hasRuleType(CardRuleType.CANNOT_RETREAT)) {
  // Handle restriction
}

// ❌ Avoid
if (card.cardRules?.some(r => r.ruleType === CardRuleType.CANNOT_RETREAT)) {
  // Handle restriction
}
```

---

## Summary

The Card Rules system provides:
- ✅ **26 distinct rule types** across 8 categories
- ✅ **Priority-based execution** for consistent resolution
- ✅ **Condition integration** for dynamic rules
- ✅ **Factory methods** for type-safe rule creation
- ✅ **Comprehensive validation** at creation time
- ✅ **Helper methods** on Card entity for easy querying

This system accurately models the complex rule interactions found in the Pokémon TCG while maintaining clean, testable code architecture.

