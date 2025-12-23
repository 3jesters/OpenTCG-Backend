# Ability Effects Client Guide

This guide explains how to use the `effects` array in ability API responses to determine what UI to show and what data to collect when a player uses a Pokémon ability.

## Overview

When a Pokémon card has an ability, the API response includes an `effects` array that describes what the ability does in structured form. This allows your client application to:

1. Determine if user input is required (e.g., selecting cards, choosing targets)
2. Show appropriate UI modals/selections
3. Build the correct `actionData` structure for the `USE_ABILITY` action

## API Response Structure

```json
{
  "ability": {
    "name": "Rain Dance",
    "text": "As often as you like during your turn...",
    "activationType": "ACTIVATED",
    "usageLimit": "UNLIMITED",
    "effects": [
      {
        "effectType": "ENERGY_ACCELERATION",
        "target": "ALL_YOURS",
        "source": "HAND",
        "count": 1,
        "energyType": "WATER",
        "targetPokemonType": "WATER"
      }
    ]
  }
}
```

## Effect Types Reference

### 1. ENERGY_ACCELERATION
Attach energy cards from a source (deck, hand, discard, or self) to Pokémon.

**Required actionData:**
- `cardId`: The Pokémon using the ability
- `target`: Position of the Pokémon using the ability (ACTIVE, BENCH_0, etc.)
- `targetPokemon` (optional): Which Pokémon to attach energy to (if `target` is not SELF)
- `sourcePokemon` (optional, **required** when `sourcePokemonTarget !== SELF`): Which Pokémon to take energy from (when `source === SELF` and `sourcePokemonTarget` is not SELF)
- `selectedCardIds` (required if `source` is HAND, DISCARD, or SELF): Array of energy card IDs to attach

**UI Flow:**
1. If `source` is `SELF`:
   - Check `sourcePokemonTarget` field:
     - If `sourcePokemonTarget !== SELF` (or undefined defaults to SELF): 
       - **Step 1**: Show Pokemon selection modal to select source Pokemon
       - Filter by `sourcePokemonTarget` (ALL_YOURS, BENCHED_YOURS, ACTIVE_YOURS)
       - **Step 2**: Show energy selection from selected source Pokemon
     - If `sourcePokemonTarget === SELF` (default):
       - Show energy selection from Pokemon using the ability
   - Filter energy by `energyType` if specified
   - Limit selection to `count` cards
2. If `source` is `HAND` or `DISCARD`: Show modal to select energy cards
   - Filter cards by `energyType` if specified
   - Limit selection to `count` cards
3. If `target` is not `SELF`: Show selection for which Pokémon to attach to
   - Filter Pokémon by `targetPokemonType` if specified
4. Build `actionData` with selections and submit

**See:** [CLIENT-ENERGY-ACCELERATION-SOURCE-SELECTION.md](./CLIENT-ENERGY-ACCELERATION-SOURCE-SELECTION.md) for complete details on `sourcePokemonTarget` feature.

**Example:**
```json
{
  "effectType": "ENERGY_ACCELERATION",
  "target": "ALL_YOURS",
  "source": "HAND",
  "count": 1,
  "energyType": "WATER",
  "targetPokemonType": "WATER"
}
```

**Required actionData:**
```json
{
  "cardId": "pokemon-base-set-v1.0-blastoise--2",
  "target": "ACTIVE",
  "targetPokemon": "ACTIVE",
  "selectedCardIds": ["pokemon-base-set-v1.0-water-energy--103"]
}
```

---

### 2. HEAL
Remove damage counters from Pokémon.

**Required actionData:**
- `cardId`: The Pokémon using the ability
- `target`: Position of the Pokémon using the ability
- `targetPokemon` (optional): Which Pokémon to heal (if `target` is not SELF)

**UI Flow:**
1. If `target` is not `SELF`: Show selection for which Pokémon to heal
2. Submit with `targetPokemon` if needed

**Example:**
```json
{
  "effectType": "HEAL",
  "target": "ALL_YOURS",
  "amount": 10
}
```

**Required actionData:**
```json
{
  "cardId": "pokemon-base-set-v1.0-alakazam--1",
  "target": "ACTIVE",
  "targetPokemon": "BENCH_0"
}
```

---

### 3. DRAW_CARDS
Draw cards from deck (no user selection needed).

**Required actionData:**
- `cardId`: The Pokémon using the ability
- `target`: Position of the Pokémon using the ability

**UI Flow:**
- No modal needed - just submit the action

**Example:**
```json
{
  "effectType": "DRAW_CARDS",
  "count": 2
}
```

**Required actionData:**
```json
{
  "cardId": "pokemon-card-id",
  "target": "ACTIVE"
}
```

---

### 4. SEARCH_DECK
Search deck for specific cards and add them to hand or bench.

**Required actionData:**
- `cardId`: The Pokémon using the ability
- `target`: Position of the Pokémon using the ability
- `selectedCardIds`: Array of card IDs selected from deck (up to `count`)

**UI Flow:**
1. Show deck search modal
2. Filter cards by `cardType` and/or `pokemonType` if specified
3. Allow selection of up to `count` cards
4. If `selector` is `CHOICE`: User selects cards
5. If `selector` is `RANDOM`: Server selects randomly
6. Submit with `selectedCardIds`

**Example:**
```json
{
  "effectType": "SEARCH_DECK",
  "count": 1,
  "destination": "HAND",
  "cardType": "POKEMON",
  "pokemonType": "FIRE",
  "selector": "CHOICE"
}
```

**Required actionData:**
```json
{
  "cardId": "pokemon-card-id",
  "target": "ACTIVE",
  "selectedCardIds": ["pokemon-base-set-v1.0-charmander--48"]
}
```

---

### 5. RETRIEVE_FROM_DISCARD
Put cards from discard pile into hand.

**Required actionData:**
- `cardId`: The Pokémon using the ability
- `target`: Position of the Pokémon using the ability
- `selectedCardIds`: Array of card IDs selected from discard (up to `count`)

**UI Flow:**
1. Show discard pile modal
2. Filter cards by `cardType` and/or `pokemonType` if specified
3. Allow selection of up to `count` cards
4. Submit with `selectedCardIds`

**Example:**
```json
{
  "effectType": "RETRIEVE_FROM_DISCARD",
  "count": 2,
  "cardType": "POKEMON",
  "selector": "CHOICE"
}
```

**Required actionData:**
```json
{
  "cardId": "pokemon-card-id",
  "target": "ACTIVE",
  "selectedCardIds": ["pokemon-card-1", "pokemon-card-2"]
}
```

---

### 6. ATTACH_FROM_DISCARD
Attach energy cards from discard pile to Pokémon.

**Required actionData:**
- `cardId`: The Pokémon using the ability
- `target`: Position of the Pokémon using the ability
- `targetPokemon` (optional): Which Pokémon to attach to
- `selectedCardIds`: Array of energy card IDs from discard (up to `count`)

**UI Flow:**
1. Show discard pile modal filtered to energy cards
2. Filter by `energyType` if specified
3. Select up to `count` cards
4. If `target` is not `SELF`: Select target Pokémon
5. Submit with `selectedCardIds` and `targetPokemon`

**Example:**
```json
{
  "effectType": "ATTACH_FROM_DISCARD",
  "target": "BENCHED_YOURS",
  "count": 1,
  "energyType": "METAL",
  "selector": "CHOICE"
}
```

**Required actionData:**
```json
{
  "cardId": "pokemon-card-id",
  "target": "ACTIVE",
  "targetPokemon": "BENCH_0",
  "selectedCardIds": ["pokemon-base-set-v1.0-metal-energy--104"]
}
```

---

### 7. DISCARD_FROM_HAND
Discard cards from hand.

**Required actionData:**
- `cardId`: The Pokémon using the ability
- `target`: Position of the Pokémon using the ability
- `handCardIds`: Array of card IDs to discard from hand

**UI Flow:**
1. Show hand selection modal
2. Filter by `cardType` if specified
3. Select cards to discard (up to `count` or all if `count` is "all")
4. Submit with `handCardIds`

**Example:**
```json
{
  "effectType": "DISCARD_FROM_HAND",
  "count": 1,
  "selector": "CHOICE",
  "cardType": "ENERGY"
}
```

**Required actionData:**
```json
{
  "cardId": "pokemon-card-id",
  "target": "ACTIVE",
  "handCardIds": ["pokemon-base-set-v1.0-water-energy--103"]
}
```

---

### 8. SWITCH_POKEMON
Switch active Pokémon with a benched Pokémon.

**Required actionData:**
- `cardId`: The Pokémon using the ability
- `target`: Position of the Pokémon using the ability (usually ACTIVE)
- `benchPosition`: Which bench position to switch with (BENCH_0, BENCH_1, etc.)

**UI Flow:**
1. Show bench selection modal
2. User selects which benched Pokémon to switch with
3. Submit with `benchPosition`

**Example:**
```json
{
  "effectType": "SWITCH_POKEMON",
  "target": "SELF",
  "with": "BENCHED_YOURS",
  "selector": "CHOICE"
}
```

**Required actionData:**
```json
{
  "cardId": "pokemon-card-id",
  "target": "ACTIVE",
  "benchPosition": "BENCH_0"
}
```

---

### 9. STATUS_CONDITION
Apply a status condition to opponent's Pokémon.

**Required actionData:**
- `cardId`: The Pokémon using the ability
- `target`: Position of the Pokémon using the ability
- `targetPokemon`: Which opponent Pokémon to affect (ACTIVE or BENCH_X)

**UI Flow:**
1. If `target` is not `DEFENDING`: Show selection for opponent Pokémon
2. Submit with `targetPokemon`

**Example:**
```json
{
  "effectType": "STATUS_CONDITION",
  "target": "DEFENDING",
  "statusCondition": "PARALYZED"
}
```

**Required actionData:**
```json
{
  "cardId": "pokemon-card-id",
  "target": "ACTIVE",
  "targetPokemon": "ACTIVE"
}
```

---

### 10. BOOST_ATTACK
Increase attack damage (passive effect, no actionData needed).

**UI Flow:**
- No user action required - this is a passive effect

**Example:**
```json
{
  "effectType": "BOOST_ATTACK",
  "target": "ALL_YOURS",
  "modifier": 10,
  "affectedTypes": ["FIRE"]
}
```

---

### 11. BOOST_HP
Increase maximum HP (passive effect, no actionData needed).

**UI Flow:**
- No user action required - this is a passive effect

**Example:**
```json
{
  "effectType": "BOOST_HP",
  "target": "SELF",
  "modifier": 30
}
```

---

### 12. PREVENT_DAMAGE
Prevent damage (passive effect, no actionData needed).

**UI Flow:**
- No user action required - this is a passive effect

**Example:**
```json
{
  "effectType": "PREVENT_DAMAGE",
  "target": "SELF",
  "duration": "TURN",
  "amount": "all"
}
```

---

### 13. REDUCE_DAMAGE
Reduce incoming damage (passive effect, no actionData needed).

**UI Flow:**
- No user action required - this is a passive effect

**Example:**
```json
{
  "effectType": "REDUCE_DAMAGE",
  "target": "SELF",
  "amount": 20
}
```

---

## Decision Tree: When to Show a Modal

Use this flow to determine if user input is needed:

```
1. Check activationType:
   - PASSIVE → No modal needed
   - TRIGGERED → No modal needed (automatic)
   - ACTIVATED → Continue to step 2

2. Check effects array:
   - If effects is empty → No modal needed
   - For each effect, check effectType:
     
     * ENERGY_ACCELERATION:
       - If source is HAND or DISCARD → Show card selection modal
       - If target is not SELF → Show Pokémon selection modal
     
     * HEAL:
       - If target is not SELF → Show Pokémon selection modal
     
     * SEARCH_DECK:
       - Always show deck search modal
     
     * RETRIEVE_FROM_DISCARD:
       - Always show discard selection modal
     
     * ATTACH_FROM_DISCARD:
       - Show discard selection modal
       - If target is not SELF → Show Pokémon selection modal
     
     * DISCARD_FROM_HAND:
       - Always show hand selection modal
     
     * SWITCH_POKEMON:
       - Always show bench selection modal
     
     * STATUS_CONDITION:
       - If target is not DEFENDING → Show opponent Pokémon selection modal
     
     * DRAW_CARDS, BOOST_ATTACK, BOOST_HP, PREVENT_DAMAGE, REDUCE_DAMAGE:
       - No modal needed
```

## Common Patterns

### Pattern 1: Simple Energy Attachment (Blastoise Rain Dance)
```typescript
const effect = ability.effects[0]; // ENERGY_ACCELERATION
if (effect.source === 'HAND') {
  // Show modal to select Water Energy from hand
  const waterEnergyCards = hand.filter(card => 
    card.energyType === effect.energyType
  );
  // User selects 1 card
  // Then show modal to select Water Pokémon to attach to
  const waterPokemon = getAllWaterPokemon();
  // Build actionData with selectedCardIds and targetPokemon
}
```

### Pattern 2: Deck Search
```typescript
const effect = ability.effects[0]; // SEARCH_DECK
if (effect.selector === 'CHOICE') {
  // Show deck search modal
  // Filter deck by cardType and pokemonType if specified
  const filteredDeck = deck.filter(card => {
    if (effect.cardType && card.cardType !== effect.cardType) return false;
    if (effect.pokemonType && card.pokemonType !== effect.pokemonType) return false;
    return true;
  });
  // User selects up to effect.count cards
  // Build actionData with selectedCardIds
}
```

### Pattern 3: No User Input Needed
```typescript
const effect = ability.effects[0];
if (effect.effectType === 'DRAW_CARDS') {
  // No modal needed - just submit with cardId and target
  const actionData = {
    cardId: pokemon.cardId,
    target: pokemon.position
  };
  // Submit immediately
}
```

## Error Handling

The server will validate:
- Required fields are present
- Selected cards are in the correct location (hand, discard, etc.)
- Card types match restrictions (energyType, cardType, pokemonType)
- Count limits are respected
- Target Pokémon exists and matches type restrictions

Handle validation errors gracefully and show appropriate error messages to the user.

## Complete Example: Blastoise Rain Dance

```typescript
// 1. Get card details
const card = await fetchCard('pokemon-base-set-v1.0-blastoise--2');
const ability = card.ability;

// 2. Check if ability needs user input
const effect = ability.effects[0]; // ENERGY_ACCELERATION
const needsCardSelection = effect.source === 'HAND' || effect.source === 'DISCARD';
const needsPokemonSelection = effect.target !== 'SELF';

// 3. Show modals if needed
let selectedCardIds = [];
let targetPokemon = null;

if (needsCardSelection) {
  // Filter hand for Water Energy
  const waterEnergyCards = playerHand.filter(card => 
    card.energyType === 'WATER'
  );
  
  // Show selection modal
  selectedCardIds = await showCardSelectionModal({
    cards: waterEnergyCards,
    maxSelection: effect.count,
    title: 'Select Water Energy to attach'
  });
}

if (needsPokemonSelection) {
  // Filter for Water Pokémon
  const waterPokemon = getAllPlayerPokemon().filter(pokemon => 
    pokemon.pokemonType === 'WATER'
  );
  
  // Show selection modal
  targetPokemon = await showPokemonSelectionModal({
    pokemon: waterPokemon,
    title: 'Select Water Pokémon to attach energy to'
  });
}

// 4. Build actionData
const actionData = {
  cardId: card.cardId,
  target: blastoisePosition, // ACTIVE or BENCH_X
  ...(targetPokemon && { targetPokemon }),
  ...(selectedCardIds.length > 0 && { selectedCardIds })
};

// 5. Submit action
await submitAction({
  playerId: currentPlayerId,
  actionType: 'USE_ABILITY',
  actionData
});
```

## Summary

- Always check `effects` array to determine required user input
- Show modals for card/Pokémon selection when needed
- Filter options based on effect restrictions (energyType, pokemonType, etc.)
- Build `actionData` with all required fields
- Handle validation errors from server
- Passive effects (BOOST_ATTACK, PREVENT_DAMAGE, etc.) don't need user input
