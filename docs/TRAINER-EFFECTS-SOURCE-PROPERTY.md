# Trainer Effects Source Property Guide

## Overview

The `source` property in trainer effect metadata indicates **where cards come from** when they are selected, retrieved, or moved by a trainer card effect. This property is critical for client UI implementation, as it determines which selection modals to display and which card pools to show to the user.

## Purpose

The `source` property tells the client:
- **Where to look** for cards that need to be selected
- **Which modal** to display (hand, discard pile, deck, etc.)
- **Which player's** cards to show (yours vs opponent's)

## Possible Source Values

| Value | Description | Client UI Action |
|-------|-------------|------------------|
| `"HAND"` | Cards from the player's hand | Show hand selection modal |
| `"DISCARD"` | Cards from the player's discard pile | Show discard pile modal |
| `"OPPONENT_DISCARD"` | Cards from the opponent's discard pile | Show opponent's discard pile modal |
| `"DECK"` | Cards from the player's deck | Show deck search/browse modal |
| `"OPPONENT_DECK"` | Cards from the opponent's deck | Show opponent's deck modal (future use) |

## When Source is Required vs Optional

### Required (Must Have Source)

These effect types **require** a `source` property because they involve selecting cards from a specific location:

- **`EVOLVE_POKEMON`** - Evolution card must come from hand
- **`PUT_INTO_PLAY`** - Card must come from hand, discard, or opponent's discard

### Optional (Defaults Apply)

These effect types have **default** source behavior if `source` is omitted:

- **`RETRIEVE_FROM_DISCARD`** - Defaults to `"DISCARD"` (player's discard)
- **`RETRIEVE_ENERGY`** - Defaults to `"DISCARD"` (player's discard)
- **`SEARCH_DECK`** - Defaults to `"DECK"` (player's deck)

**Best Practice:** Always include explicit `source` values for clarity and self-documentation, even when defaults apply.

## Effect Types That Use Source

### EVOLVE_POKEMON

**Purpose:** Force evolution using a card from hand

**Source Values:**
- `"HAND"` - Evolution card comes from player's hand (required)

**Example:**
```json
{
  "effectType": "EVOLVE_POKEMON",
  "source": "HAND",
  "target": "ALL_YOURS",
  "description": "Evolve Basic Pokémon to Stage 2"
}
```

**Client Implementation:**
1. Show Pokémon selection modal (active + bench based on `target`)
2. User selects Pokémon to evolve
3. Show hand selection modal filtered to evolution cards
4. User selects evolution card from hand
5. Send `target` and `evolutionCardId` in actionData

**Example Card:** Pokémon Breeder

---

### PUT_INTO_PLAY

**Purpose:** Put a card into play from a specific location

**Source Values:**
- `"HAND"` - Card is played from hand (e.g., Clefairy Doll, Mysterious Fossil)
- `"DISCARD"` - Card comes from player's discard pile
- `"OPPONENT_DISCARD"` - Card comes from opponent's discard pile

**Example (from hand):**
```json
{
  "effectType": "PUT_INTO_PLAY",
  "source": "HAND",
  "target": "SELF",
  "description": "Play as a Basic Pokémon with special rules"
}
```

**Example (from opponent's discard):**
```json
{
  "effectType": "PUT_INTO_PLAY",
  "source": "OPPONENT_DISCARD",
  "target": "BENCHED_OPPONENTS",
  "value": 1,
  "cardType": "Basic Pokemon",
  "description": "Put Basic Pokémon from opponent's discard onto their Bench"
}
```

**Client Implementation:**
- If `source: "HAND"` - Card is played directly (no selection needed)
- If `source: "DISCARD"` - Show discard pile modal, user selects card
- If `source: "OPPONENT_DISCARD"` - Show opponent's discard pile modal, user selects card

**Example Cards:** Clefairy Doll, Mysterious Fossil, Pokémon Flute

---

### RETRIEVE_FROM_DISCARD

**Purpose:** Retrieve cards from discard pile to hand

**Source Values:**
- `"DISCARD"` - Default, player's discard pile
- `"OPPONENT_DISCARD"` - Opponent's discard pile (future use)

**Example:**
```json
{
  "effectType": "RETRIEVE_FROM_DISCARD",
  "source": "DISCARD",
  "target": "SELF",
  "value": 1,
  "cardType": "Trainer",
  "description": "Retrieve a Trainer card from discard pile"
}
```

**Client Implementation:**
1. Show discard pile modal (player's or opponent's based on `source`)
2. Filter cards by `cardType` if specified
3. User selects cards (up to `value` if specified)
4. Return `selectedCardIds` array

**Example Cards:** Item Finder, Recycle

---

### RETRIEVE_ENERGY

**Purpose:** Retrieve energy cards from discard pile to hand

**Source Values:**
- `"DISCARD"` - Default, player's discard pile

**Example:**
```json
{
  "effectType": "RETRIEVE_ENERGY",
  "source": "DISCARD",
  "target": "SELF",
  "value": 2,
  "cardType": "Energy",
  "description": "Get up to 2 basic Energy from discard"
}
```

**Client Implementation:**
1. Show discard pile modal filtered to energy cards
2. User selects energy cards (up to `value`)
3. Return `selectedCardIds` array (can be empty if user chooses 0)

**Example Cards:** Energy Retrieval

---

### SEARCH_DECK

**Purpose:** Search deck for specific cards

**Source Values:**
- `"DECK"` - Default, player's deck

**Example:**
```json
{
  "effectType": "SEARCH_DECK",
  "source": "DECK",
  "target": "SELF",
  "value": 1,
  "cardType": "POKEMON",
  "description": "Search deck for any Basic or Evolution Pokémon"
}
```

**Client Implementation:**
1. Show deck browse/search modal
2. Filter cards by `cardType` if specified
3. User selects cards (up to `value`)
4. Return `selectedCardIds` array

**Example Cards:** Computer Search, Poke Ball, Energy Search

---

## Client Implementation Patterns

### Pattern 1: Hand Selection (source: "HAND")

**Use Case:** Evolution cards, cards played from hand

```typescript
if (effect.source === "HAND") {
  // Show hand selection modal
  // Filter cards based on cardType if specified
  // User selects card(s)
  // Return selectedCardIds or evolutionCardId
}
```

### Pattern 2: Discard Pile Selection (source: "DISCARD")

**Use Case:** Retrieving cards from discard

```typescript
if (effect.source === "DISCARD" || !effect.source) {
  // Default to player's discard
  // Show discard pile modal
  // Filter by cardType if specified
  // User selects cards (up to value)
  // Return selectedCardIds array
}
```

### Pattern 3: Opponent's Discard Selection (source: "OPPONENT_DISCARD")

**Use Case:** Cards that interact with opponent's discard

```typescript
if (effect.source === "OPPONENT_DISCARD") {
  // Show opponent's discard pile modal
  // Filter by cardType if specified
  // User selects card(s)
  // Return selectedCardIds
}
```

### Pattern 4: Deck Search (source: "DECK")

**Use Case:** Searching deck for cards

```typescript
if (effect.source === "DECK" || !effect.source) {
  // Default to player's deck
  // Show deck browse/search modal
  // Filter by cardType if specified
  // User selects cards (up to value)
  // Return selectedCardIds array
}
```

## Default Behavior Summary

| Effect Type | Default Source | Notes |
|-------------|----------------|-------|
| `EVOLVE_POKEMON` | **Required** | Must specify `source: "HAND"` |
| `PUT_INTO_PLAY` | **Required** | Must specify source (HAND, DISCARD, or OPPONENT_DISCARD) |
| `RETRIEVE_FROM_DISCARD` | `"DISCARD"` | Player's discard pile |
| `RETRIEVE_ENERGY` | `"DISCARD"` | Player's discard pile |
| `SEARCH_DECK` | `"DECK"` | Player's deck |

## Examples by Card

### Pokémon Breeder
```json
{
  "effectType": "EVOLVE_POKEMON",
  "source": "HAND",
  "target": "ALL_YOURS"
}
```
**Client:** Show Pokémon selection → Show hand selection for evolution cards

### Pokémon Flute
```json
{
  "effectType": "PUT_INTO_PLAY",
  "source": "OPPONENT_DISCARD",
  "target": "BENCHED_OPPONENTS",
  "cardType": "Basic Pokemon"
}
```
**Client:** Show opponent's discard pile → User selects Basic Pokémon

### Energy Retrieval
```json
{
  "effectType": "RETRIEVE_ENERGY",
  "source": "DISCARD",
  "target": "SELF",
  "value": 2
}
```
**Client:** Show discard pile filtered to energy cards → User selects up to 2

### Clefairy Doll / Mysterious Fossil
```json
{
  "effectType": "PUT_INTO_PLAY",
  "source": "HAND",
  "target": "SELF"
}
```
**Client:** Card is played directly from hand (no selection modal needed)

## Best Practices

1. **Always check `source`** before showing selection modals
2. **Respect defaults** - If `source` is missing, use default behavior
3. **Filter by `cardType`** - When `cardType` is specified, filter the selection pool
4. **Respect `value`** - Limit selections to `value` if specified
5. **Handle empty selections** - Some effects allow 0 selections (e.g., RETRIEVE_ENERGY)
6. **Show appropriate modals** - Use `source` to determine which modal component to display
7. **Validate selections** - Pre-validate on client for better UX (server will also validate)

## Related Documentation

- [Trainer Effects Client Guide](./TRAINER-EFFECTS-CLIENT-GUIDE.md) - Complete guide to all trainer effects
- [Client Gameplay Actions](./CLIENT-GAMEPLAY-ACTIONS.md) - API endpoints and action data formats

