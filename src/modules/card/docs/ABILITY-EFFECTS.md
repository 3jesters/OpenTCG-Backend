# Ability Effects

## Overview
Ability effects are structured representations of what happens when a Pokémon's ability activates. Abilities can be passive (always active), triggered (activate on game events), or activated (player chooses to use).

The ability system uses the **reusable Generic Condition System** and shares some effect types with attacks while adding ability-specific effects.

---

## Ability Structure

```typescript
class Ability {
  name: string;
  text: string;
  activationType: AbilityActivationType;  // PASSIVE, TRIGGERED, or ACTIVATED
  effects: AbilityEffect[];
  triggerEvent?: GameEventType;          // Required for TRIGGERED abilities
  usageLimit?: UsageLimit;               // For ACTIVATED abilities
}
```

---

## Activation Types

### 1. PASSIVE
Always active, no player action required.

**Examples:**
- "All your Fire Pokémon do 10 more damage"
- "This Pokémon has 30 more HP"
- "Prevent all damage done to this Pokémon by Fire attacks"

### 2. TRIGGERED
Automatically activates when a specific game event occurs.

**Game Event Types:**
- WHEN_PLAYED: When this card is played
- WHEN_DAMAGED: When this Pokémon takes damage
- WHEN_ATTACKING: When this Pokémon attacks
- WHEN_DEFENDING: When this Pokémon is attacked
- BETWEEN_TURNS: Between turns
- WHEN_KNOCKED_OUT: When this Pokémon is knocked out
- START_OF_TURN: At the start of your turn
- END_OF_TURN: At the end of your turn

**Examples:**
- "When you play this Pokémon, draw 2 cards"
- "When this Pokémon is damaged, the opponent is Poisoned"
- "At the start of your turn, heal 10 damage"

### 3. ACTIVATED
Player chooses to use it, often with usage limits.

**Usage Limits:**
- `UsageLimit.ONCE_PER_TURN`: Can be used once per turn
- `UsageLimit.UNLIMITED`: Can be used multiple times

**Examples:**
- "Once during your turn, you may heal 30 damage"
- "As often as you like, move a damage counter"

---

## Effect Structure

All ability effects follow a common pattern:

```typescript
interface AbilityEffect {
  effectType: AbilityEffectType;
  target?: 'self' | 'all_yours' | 'all_opponents' | 'defending' | 
           'benched_yours' | 'benched_opponents' | 'active_yours' | 
           'active_opponent';
  requiredConditions?: Condition[];
}
```

---

## Effect Types

### Shared with Attacks (5 types)
1. **HEAL** - Heal damage from Pokémon
2. **PREVENT_DAMAGE** - Prevent damage
3. **STATUS_CONDITION** - Apply status
4. **ENERGY_ACCELERATION** - Attach energy
5. **SWITCH_POKEMON** - Switch Pokémon

### Ability-Specific (8 types)
6. **DRAW_CARDS** - Draw cards from deck
7. **SEARCH_DECK** - Search deck for cards
8. **BOOST_ATTACK** - Increase attack damage
9. **BOOST_HP** - Increase maximum HP
10. **REDUCE_DAMAGE** - Reduce incoming damage
11. **DISCARD_FROM_HAND** - Discard cards from hand
12. **ATTACH_FROM_DISCARD** - Attach from discard pile
13. **RETRIEVE_FROM_DISCARD** - Put cards from discard to hand

---

## Detailed Effect Documentation

### 1. HEAL (Shared)

Heal damage from Pokémon.

**Structure:**
```typescript
{
  effectType: AbilityEffectType.HEAL,
  target: 'self' | 'all_yours' | 'benched_yours' | 'active_yours',
  amount: number,
  requiredConditions?: Condition[]
}
```

**Examples:**
```typescript
// Heal self
AbilityEffectFactory.heal('self', 30);

// Heal all your Pokémon
AbilityEffectFactory.heal('all_yours', 10);
```

**Real Card Examples:**
- **Venusaur - Solar Power**: "Once during your turn, you may heal 30 damage from 1 of your Pokémon"
- **Blissey - Soft Boiled**: "Heal 10 damage from each of your Pokémon"

---

### 2. PREVENT_DAMAGE (Shared)

Prevent damage to Pokémon.

**Structure:**
```typescript
{
  effectType: AbilityEffectType.PREVENT_DAMAGE,
  target: 'self' | 'all_yours' | 'benched_yours' | 'active_yours' | 'defending',
  duration: 'next_turn' | 'this_turn' | 'permanent',
  amount?: number | 'all',
  requiredConditions?: Condition[]
}
```

**Examples:**
```typescript
// Permanent prevention
AbilityEffectFactory.preventDamage('self', 'permanent', 'all');

// Prevent specific amount
AbilityEffectFactory.preventDamage('self', 'permanent', 20);
```

**Real Card Examples:**
- **Keldeo-GX - Pure Heart**: "Prevent all effects of your opponent's attacks, including damage, done to this Pokémon"
- **Suicune - Barrier**: "Prevent all damage done to this Pokémon during your opponent's next turn"

---

### 3. STATUS_CONDITION (Shared)

Apply status condition.

**Structure:**
```typescript
{
  effectType: AbilityEffectType.STATUS_CONDITION,
  target: 'defending' | 'all_opponents' | 'active_opponent',
  statusCondition: 'PARALYZED' | 'POISONED' | 'BURNED' | 'ASLEEP' | 'CONFUSED',
  requiredConditions?: Condition[]
}
```

**Examples:**
```typescript
// Poison defending Pokémon
AbilityEffectFactory.statusCondition('POISONED', 'defending');
```

**Real Card Examples:**
- **Toxapex - Poisonous Nest**: "When your opponent's Active Pokémon is Knocked Out, it is now Poisoned"

---

### 4. ENERGY_ACCELERATION (Shared)

Attach energy from deck, discard, or hand.

**Structure:**
```typescript
{
  effectType: AbilityEffectType.ENERGY_ACCELERATION,
  target: 'self' | 'benched_yours' | 'all_yours' | 'active_yours',
  source: 'deck' | 'discard' | 'hand',
  count: number,
  energyType?: EnergyType,
  selector?: 'choice' | 'random',
  requiredConditions?: Condition[]
}
```

**Examples:**
```typescript
// Attach from discard
AbilityEffectFactory.energyAcceleration(
  'benched_yours',
  'discard',
  1,
  EnergyType.FIRE,
  'choice'
);
```

**Real Card Examples:**
- **Metagross - Geotech System**: "Once during your turn, attach a Metal Energy from discard to a Benched Pokémon"
- **Vikavolt - Strong Charge**: "Attach a Grass or Electric Energy from your deck"

---

### 5. SWITCH_POKEMON (Shared)

Switch this Pokémon with a benched Pokémon.

**Structure:**
```typescript
{
  effectType: AbilityEffectType.SWITCH_POKEMON,
  target: 'self',
  with: 'benched_yours',
  selector: 'choice' | 'random',
  requiredConditions?: Condition[]
}
```

**Examples:**
```typescript
// Player chooses which to switch with
AbilityEffectFactory.switchPokemon('choice');
```

**Real Card Examples:**
- **Keldeo-EX - Rush In**: "Once during your turn, you may switch this Pokémon with your Active Pokémon"

---

### 6. DRAW_CARDS (Ability-Specific)

Draw cards from deck.

**Structure:**
```typescript
{
  effectType: AbilityEffectType.DRAW_CARDS,
  count: number,
  requiredConditions?: Condition[]
}
```

**Examples:**
```typescript
// Draw 2 cards
AbilityEffectFactory.drawCards(2);

// Draw 1 card if damaged
AbilityEffectFactory.drawCards(1, [ConditionFactory.selfHasDamage()]);
```

**Real Card Examples:**
- **Magnezone - Magnetic Draw**: "Once during your turn, draw cards until you have 6 in your hand"
- **Octillery - Abyssal Hand**: "Once during your turn, draw cards until you have 5 in your hand"
- **Pyukumuku - Innards Out**: "If this Pokémon is Knocked Out, draw 2 cards"

---

### 7. SEARCH_DECK (Ability-Specific)

Search deck for specific cards.

**Structure:**
```typescript
{
  effectType: AbilityEffectType.SEARCH_DECK,
  cardType?: CardType,
  pokemonType?: PokemonType,
  count: number,
  destination: 'hand' | 'bench',
  selector?: 'choice' | 'random',
  requiredConditions?: Condition[]
}
```

**Examples:**
```typescript
// Search for Fire Pokémon
AbilityEffectFactory.searchDeck(
  1,
  'hand',
  { cardType: CardType.POKEMON, pokemonType: PokemonType.FIRE }
);

// Search for any Pokémon to bench
AbilityEffectFactory.searchDeck(
  1,
  'bench',
  { cardType: CardType.POKEMON, selector: 'choice' }
);
```

**Real Card Examples:**
- **Tapu Lele-GX - Wonder Tag**: "When you play this Pokémon, search your deck for a Supporter card"
- **Alolan Ninetales-GX - Sublimation**: "Search your deck for 2 Item cards"
- **Hoopa - Scoundrel Ring**: "Search your deck for 3 Pokémon-EX and put them in your hand"

---

### 8. BOOST_ATTACK (Ability-Specific)

Increase attack damage for self or allies.

**Structure:**
```typescript
{
  effectType: AbilityEffectType.BOOST_ATTACK,
  target: 'self' | 'all_yours' | 'benched_yours' | 'active_yours',
  modifier: number,
  affectedTypes?: PokemonType[],
  requiredConditions?: Condition[]
}
```

**Examples:**
```typescript
// Boost all Fire Pokémon
AbilityEffectFactory.boostAttack('all_yours', 10, [PokemonType.FIRE]);

// Boost self only
AbilityEffectFactory.boostAttack('self', 30);
```

**Real Card Examples:**
- **Charizard - Blaze**: "All your Fire Pokémon do 10 more damage to the opponent's Active Pokémon"
- **Machamp - Fighting Fury**: "All your Fighting Pokémon's attacks do 20 more damage"
- **Reshiram & Charizard-GX - Flare Strike**: "This Pokémon's attacks do 30 more damage"

---

### 9. BOOST_HP (Ability-Specific)

Increase maximum HP.

**Structure:**
```typescript
{
  effectType: AbilityEffectType.BOOST_HP,
  target: 'self' | 'all_yours' | 'benched_yours' | 'active_yours',
  modifier: number,
  requiredConditions?: Condition[]
}
```

**Examples:**
```typescript
// Boost self HP
AbilityEffectFactory.boostHP('self', 30);

// Boost all your Pokémon
AbilityEffectFactory.boostHP('all_yours', 20);
```

**Real Card Examples:**
- **Snorlax - Thick Fat**: "This Pokémon has 30 more HP"
- **Wailord - Thick Skin**: "This Pokémon has 100 more HP"

---

### 10. REDUCE_DAMAGE (Ability-Specific)

Reduce incoming damage from attacks.

**Structure:**
```typescript
{
  effectType: AbilityEffectType.REDUCE_DAMAGE,
  target: 'self' | 'all_yours' | 'benched_yours' | 'active_yours',
  amount: number | 'all',
  source?: PokemonType,
  requiredConditions?: Condition[]
}
```

**Examples:**
```typescript
// Reduce damage from Fire Pokémon
AbilityEffectFactory.reduceDamage('self', 20, PokemonType.FIRE);

// Reduce all damage
AbilityEffectFactory.reduceDamage('self', 'all');
```

**Real Card Examples:**
- **Giratina - Shadow Guard**: "Prevent all damage done to this Pokémon by attacks from Basic Pokémon"
- **Alolan Sandslash - Ice Armor**: "This Pokémon takes 20 less damage from Fire-type attacks"

---

### 11. DISCARD_FROM_HAND (Ability-Specific)

Discard cards from player's hand.

**Structure:**
```typescript
{
  effectType: AbilityEffectType.DISCARD_FROM_HAND,
  count: number | 'all',
  selector: 'choice' | 'random',
  cardType?: CardType,
  requiredConditions?: Condition[]
}
```

**Examples:**
```typescript
// Discard 1 card (player's choice)
AbilityEffectFactory.discardFromHand(1, 'choice');

// Discard specific card type
AbilityEffectFactory.discardFromHand(1, 'choice', CardType.ENERGY);
```

**Real Card Examples:**
- **Ultra Necrozma-GX - Sky-Scorching Light**: "Discard all Energy from this Pokémon"

---

### 12. ATTACH_FROM_DISCARD (Ability-Specific)

Attach cards from discard pile to Pokémon.

**Structure:**
```typescript
{
  effectType: AbilityEffectType.ATTACH_FROM_DISCARD,
  target: 'self' | 'benched_yours' | 'all_yours' | 'active_yours',
  energyType?: EnergyType,
  count: number,
  selector?: 'choice' | 'random',
  requiredConditions?: Condition[]
}
```

**Examples:**
```typescript
// Attach Fire energy from discard
AbilityEffectFactory.attachFromDiscard(
  'benched_yours',
  1,
  EnergyType.FIRE,
  'choice'
);
```

**Real Card Examples:**
- **Blacksmith Supporter**: "Attach 2 Fire Energy from your discard pile to 1 of your Fire Pokémon"

---

### 13. RETRIEVE_FROM_DISCARD (Ability-Specific)

Put cards from discard pile to hand.

**Structure:**
```typescript
{
  effectType: AbilityEffectType.RETRIEVE_FROM_DISCARD,
  cardType?: CardType,
  pokemonType?: PokemonType,
  count: number,
  selector: 'choice' | 'random',
  requiredConditions?: Condition[]
}
```

**Examples:**
```typescript
// Retrieve 2 Pokémon from discard
AbilityEffectFactory.retrieveFromDiscard(
  2,
  'choice',
  { cardType: CardType.POKEMON }
);
```

**Real Card Examples:**
- **Lusamine Supporter**: "Put 2 cards from your discard pile into your hand"
- **Brock's Grit**: "Shuffle 6 Pokémon or Energy from your discard pile into your deck"

---

## Complete Ability Examples

### Example 1: Charizard - Blaze (Passive)
```typescript
const blaze = new Ability(
  'Blaze',
  'All your Fire Pokémon do 10 more damage to the opponent\'s Active Pokémon',
  AbilityActivationType.PASSIVE,
  [AbilityEffectFactory.boostAttack('all_yours', 10, [PokemonType.FIRE])]
);
```

### Example 2: Pyukumuku - Innards Out (Triggered)
```typescript
const innardsOut = new Ability(
  'Innards Out',
  'If this Pokémon is your Active Pokémon and is Knocked Out, draw 2 cards',
  AbilityActivationType.TRIGGERED,
  [AbilityEffectFactory.drawCards(2)],
  GameEventType.WHEN_KNOCKED_OUT
);
```

### Example 3: Venusaur - Solar Power (Activated)
```typescript
const solarPower = new Ability(
  'Solar Power',
  'Once during your turn, you may heal 30 damage from 1 of your Pokémon',
  AbilityActivationType.ACTIVATED,
  [AbilityEffectFactory.heal('benched_yours', 30)],
  undefined,
  UsageLimit.ONCE_PER_TURN
);
```

### Example 4: Metagross - Geotech System (Activated with Multiple Attributes)
```typescript
const geotechSystem = new Ability(
  'Geotech System',
  'Once during your turn, you may attach a Metal Energy card from your discard pile to 1 of your Benched Pokémon',
  AbilityActivationType.ACTIVATED,
  [
    AbilityEffectFactory.attachFromDiscard(
      'benched_yours',
      1,
      EnergyType.METAL,
      'choice'
    )
  ],
  undefined,
  UsageLimit.ONCE_PER_TURN
);
```

### Example 5: Keldeo-GX - Pure Heart (Passive Damage Prevention)
```typescript
const pureHeart = new Ability(
  'Pure Heart',
  'Prevent all effects of your opponent\'s attacks, including damage, done to this Pokémon by Pokémon-GX or Pokémon-EX',
  AbilityActivationType.PASSIVE,
  [AbilityEffectFactory.preventDamage('self', 'permanent', 'all')]
);
```

### Example 6: Tapu Lele-GX - Wonder Tag (Triggered on Play)
```typescript
const wonderTag = new Ability(
  'Wonder Tag',
  'When you play this Pokémon from your hand onto your Bench during your turn, you may search your deck for a Supporter card',
  AbilityActivationType.TRIGGERED,
  [
    AbilityEffectFactory.searchDeck(1, 'hand', {
      cardType: CardType.TRAINER,
      selector: 'choice'
    })
  ],
  GameEventType.WHEN_PLAYED
);
```

### Example 7: Alakazam - Damage Swap (Activated Unlimited)
```typescript
const damageSwap = new Ability(
  'Damage Swap',
  'As often as you like during your turn, move 1 damage counter from 1 of your Pokémon to another of your Pokémon',
  AbilityActivationType.ACTIVATED,
  [
    AbilityEffectFactory.heal('benched_yours', 10)
    // Would also need a damage effect (not yet implemented)
  ],
  undefined,
  UsageLimit.UNLIMITED
);
```

---

## Using Conditions with Abilities

Abilities can have effects with required conditions:

```typescript
// Effect only if self has damage
const conditionalHeal = new Ability(
  'Recovery',
  'If this Pokémon has damage, heal 20 damage at the start of your turn',
  AbilityActivationType.TRIGGERED,
  [
    AbilityEffectFactory.heal('self', 20, [
      ConditionFactory.selfHasDamage()
    ])
  ],
  GameEventType.START_OF_TURN
);

// Effect only if specific energy attached
const conditionalBoost = new Ability(
  'Flame Boost',
  'If this Pokémon has at least 3 Fire Energy attached, it does 30 more damage',
  AbilityActivationType.PASSIVE,
  [
    AbilityEffectFactory.boostAttack('self', 30, undefined, [
      ConditionFactory.selfHasEnergyType(EnergyType.FIRE, 3)
    ])
  ]
);
```

---

## Validation

All abilities and effects are automatically validated:

### Ability Validation
- Name and text are required
- Activation type must be valid
- TRIGGERED abilities must have a trigger event
- PASSIVE abilities cannot have usage limits
- Must have at least one effect
- All effects must be valid

### Effect Validation
- Each effect type has specific validation rules
- Targets must be appropriate for the effect
- Amounts must be positive (or 'all' where allowed)
- Conditions are validated if present

**Example Error:**
```typescript
// This will throw an error
const invalid = new Ability(
  'Test',
  'text',
  AbilityActivationType.TRIGGERED,
  [AbilityEffectFactory.drawCards(1)]
  // Missing trigger event!
);
// Error: Triggered abilities must specify a trigger event
```

---

## Helper Methods

### Ability Methods
```typescript
ability.isPassive()              // Check if passive
ability.isTriggered()            // Check if triggered
ability.isActivated()            // Check if activated
ability.hasEffects()             // Check if has effects
ability.getEffectsByType(type)   // Get effects of specific type
ability.canBeUsed()              // Check if can be used (placeholder)
ability.getActivationDescription() // Get human-readable description
```

---

## Implementation Status

### ✅ Phase 1 Complete
- 3 activation types (PASSIVE, TRIGGERED, ACTIVATED)
- 8 game event types (reusable across system)
- 13 effect types (5 shared, 8 ability-specific)
- Type-safe value interfaces for all effects
- `AbilityEffectFactory` for easy creation
- `AbilityEffectValidator` with comprehensive validation
- Complete `Ability` value object with helper methods
- Integration with Generic Condition System
- 200+ unit tests
- Complete documentation

### 🔄 Phase 2 (Future)
- Ability execution engine
- Game state integration
- Effect resolution
- Additional effect types as needed

---

## Usage Summary

```typescript
import {
  Ability,
  AbilityActivationType,
  GameEventType,
  AbilityEffectFactory,
  AbilityEffectType,
  PokemonType,
} from './modules/card/domain';

// Create a passive ability
const blaze = new Ability(
  'Blaze',
  'All your Fire Pokémon do 10 more damage',
  AbilityActivationType.PASSIVE,
  [AbilityEffectFactory.boostAttack('all_yours', 10, [PokemonType.FIRE])]
);

// Create a triggered ability
const roughSkin = new Ability(
  'Rough Skin',
  'When this Pokémon is damaged, draw a card',
  AbilityActivationType.TRIGGERED,
  [AbilityEffectFactory.drawCards(1)],
  GameEventType.WHEN_DAMAGED
);

// Query ability
if (ability.isPassive()) {
  console.log('This ability is always active');
}

const boostEffects = ability.getEffectsByType(AbilityEffectType.BOOST_ATTACK);
console.log(`Has ${boostEffects.length} boost effects`);
```

---

**Built with Clean Architecture | Type Safety | Comprehensive Validation | Reusable Game Events**
