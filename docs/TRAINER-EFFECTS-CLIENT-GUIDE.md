# Trainer Effects Client Implementation Guide

This document summarizes all trainer effects supported by the server and what UI/UX the client needs to implement for each effect.

## Overview

The server uses a **metadata-driven** trainer effects system. Trainer cards have `trainerEffects` metadata that defines what they do. The client must read these effects and provide appropriate UI for user selection.

**Key Metadata Fields:**
- `effectType`: The type of effect (e.g., `HEAL`, `PUT_INTO_PLAY`)
- `target`: Who/what is targeted (e.g., `ALL_YOURS`, `BENCHED_OPPONENTS`)
- `source`: (Optional) Where cards come from for retrieval/movement effects (e.g., `"DISCARD"`, `"OPPONENT_DISCARD"`, `"HAND"`, `"DECK"`)
- `value`: Numeric value for the effect (e.g., HP to heal, cards to draw)
- `cardType`: Type of card to search/retrieve (e.g., `"Energy"`, `"Basic Pokemon"`)

---

## Target Type Filtering Behavior

The `target` field in trainer effects determines which Pokémon/cards are shown in selection modals:

### Player Targets
- **`ALL_YOURS`** → Show **both active and bench** Pokémon
- **`ACTIVE_YOURS`** → Show **only active** Pokémon (hide bench)
- **`BENCHED_YOURS`** → Show **only bench** Pokémon (hide active)

### Opponent Targets
- **`ALL_OPPONENTS`** → Show **both active and bench** Pokémon
- **`ACTIVE_OPPONENT`** → Show **only active** Pokémon (hide bench)
- **`BENCHED_OPPONENTS`** → Show **only bench** Pokémon (hide active)

**Note:** The `BENCH_POKEMON` selection type is misleadingly named - it's used for selecting any Pokémon (active or bench). The selection modal component filters based on the `target` enum value passed via the `target` prop.

---

## Effect Categories

### 1. Card Drawing & Deck Manipulation
### 2. Card Discard & Retrieval
### 3. Pokémon Manipulation
### 4. Healing & Damage Removal
### 5. Energy Manipulation
### 6. Opponent Manipulation
### 7. Special Effects

---

## Supported Trainer Effects

### HEAL
**Effect Type:** `HEAL`  
**Description:** Remove damage counters from Pokémon (e.g., Potion, Super Potion)  
**Target Types:** `ALL_YOURS`, `ACTIVE_YOURS`, `ALL_OPPONENTS`, `ACTIVE_OPPONENT`  
**Value:** HP amount to heal (e.g., 20 HP = 2 damage counters)

**Required actionData:**
```typescript
{
  cardId: string;
  target: string; // 'ACTIVE' | 'BENCH_0' | 'BENCH_1' | etc.
}
```

**Client UI Required:**
- **If `target === ALL_YOURS`:** Open **player's** active and bench Pokémon selection modal
  - Show active Pokémon (if exists)
  - Show all bench Pokémon (if any)
  - User selects which Pokémon to heal
  - Return `target: 'ACTIVE'` or `target: 'BENCH_X'`
- **If `target === ACTIVE_YOURS`:** Open **player's** active Pokémon selection modal
  - Show only active Pokémon (hide bench)
  - User selects active Pokémon
  - Return `target: 'ACTIVE'`
- **If `target === ALL_OPPONENTS`:** Open **opponent's** active and bench Pokémon selection modal
  - Show opponent's active Pokémon (if exists)
  - Show opponent's bench Pokémon (if any)
  - User selects which Pokémon to heal
  - Return `target: 'ACTIVE'` or `target: 'BENCH_X'`
- **If `target === ACTIVE_OPPONENT`:** Open **opponent's** active Pokémon selection modal
  - Show only opponent's active Pokémon (hide bench)
  - User selects opponent's active Pokémon
  - Return `target: 'ACTIVE'`

**Example Cards:** Potion, Super Potion, Full Heal

---

### REMOVE_ENERGY
**Effect Type:** `REMOVE_ENERGY`  
**Description:** Remove energy cards from opponent's Pokémon (e.g., Energy Removal)  
**Target Types:** `ALL_OPPONENTS`, `ACTIVE_OPPONENT`, `BENCHED_OPPONENTS`  
**Value:** Number of energy cards to remove (typically 1-2)

**Required actionData:**
```typescript
{
  cardId: string;
  target: string; // 'ACTIVE' | 'BENCH_0' | 'BENCH_1' | etc.
  energyCardId: string; // ID of energy card to remove
}
```

**Client UI Required:**
- Open **opponent's** active and bench Pokémon selection modal
- After selecting Pokémon, show that Pokémon's attached energy cards
- User selects which energy card to remove
- Return `target: 'ACTIVE'` or `target: 'BENCH_X'` and `energyCardId`

**Example Cards:** Energy Removal, Super Energy Removal

---

### RETRIEVE_ENERGY
**Effect Type:** `RETRIEVE_ENERGY`  
**Description:** Get energy cards from discard pile (e.g., Energy Retrieval)  
**Target Types:** `SELF`  
**Value:** Maximum number of energy cards to retrieve (typically 2)

**Required actionData:**
```typescript
{
  cardId: string;
  handCardId?: string; // Required if card also has DISCARD_HAND effect
  handCardIndex?: number; // Optional, for disambiguation
  selectedCardIds: string[]; // Array of energy card IDs to retrieve (can be empty, max 2)
}
```

**Client UI Required:**
- **If card has DISCARD_HAND effect:** First open **hand selection modal**
  - User selects card from hand to discard
  - Return `handCardId` and optionally `handCardIndex`
- Open **discard pile modal** showing all cards
- Filter/show only energy cards (or let user select any, server validates)
- User selects up to `value` energy cards (can select 0)
- Return `selectedCardIds: []` (empty array if none selected)

**Example Cards:** Energy Retrieval

---

### DISCARD_HAND
**Effect Type:** `DISCARD_HAND`  
**Description:** Discard cards from hand (often combined with other effects)  
**Target Types:** `SELF`  
**Value:** Number of cards to discard (typically 1-2)

**Required actionData:**
```typescript
{
  cardId: string;
  handCardId: string; // Card ID to discard
  handCardIndex?: number; // Optional, for disambiguation when multiple copies exist
}
```

**Client UI Required:**
- Open **hand selection modal**
- Show all cards in hand
- User selects card(s) to discard
- Return `handCardId` and optionally `handCardIndex` (if multiple copies exist)

**Example Cards:** Energy Retrieval, Computer Search

---

### DRAW_CARDS
**Effect Type:** `DRAW_CARDS`  
**Description:** Draw cards from deck (e.g., Bill)  
**Target Types:** `SELF`  
**Value:** Number of cards to draw

**Required actionData:**
```typescript
{
  cardId: string;
  // No additional fields needed
}
```

**Client UI Required:**
- **No UI needed** - effect is automatic
- Cards are drawn automatically from deck
- Client should show animation/notification of cards drawn

**Example Cards:** Bill

---

### SHUFFLE_DECK
**Effect Type:** `SHUFFLE_DECK`  
**Description:** Shuffle your deck  
**Target Types:** `SELF`  
**Value:** N/A

**Required actionData:**
```typescript
{
  cardId: string;
  // No additional fields needed
}
```

**Client UI Required:**
- **No UI needed** - effect is automatic
- Deck is shuffled automatically
- Client should show shuffle animation/notification

**Example Cards:** Computer Search (after searching)

---

### SEARCH_DECK
**Effect Type:** `SEARCH_DECK`  
**Description:** Search deck for specific cards and add to hand (e.g., Computer Search)  
**Target Types:** `SELF`  
**Value:** Maximum number of cards to search/select (typically 1)

**Required actionData:**
```typescript
{
  cardId: string;
  selectedCardIds: string[]; // Array of card IDs to add to hand
}
```

**Client UI Required:**
- Open **deck modal** with all cards visible
- User can browse/search through deck
- User selects up to `value` cards
- Return `selectedCardIds: ['card-id-1', 'card-id-2']`
- Cards are added to hand, deck is shuffled automatically

**Example Cards:** Computer Search, Pokémon Trader

---

### SWITCH_ACTIVE
**Effect Type:** `SWITCH_ACTIVE`  
**Description:** Switch active Pokémon with bench Pokémon (e.g., Switch)  
**Target Types:** `ACTIVE_YOURS`, `BENCHED_YOURS`  
**Value:** N/A

**Required actionData:**
```typescript
{
  cardId: string;
  benchPosition: string; // 'BENCH_0' | 'BENCH_1' | etc.
}
```

**Client UI Required:**
- Open **player's bench Pokémon selection modal**
- **If `target === BENCHED_YOURS`:** Show only bench Pokémon (hide active)
- **If `target === ACTIVE_YOURS`:** This target type is not applicable for SWITCH_ACTIVE
- User selects which bench Pokémon to switch with active
- Return `benchPosition: 'BENCH_X'`

**Example Cards:** Switch

---

### FORCE_SWITCH
**Effect Type:** `FORCE_SWITCH`  
**Description:** Force opponent to switch active Pokémon (e.g., Gust of Wind)  
**Target Types:** `BENCHED_OPPONENTS`  
**Value:** N/A

**Required actionData:**
```typescript
{
  cardId: string;
  benchPosition: string; // 'BENCH_0' | 'BENCH_1' | etc.
}
```

**Client UI Required:**
- Open **opponent's bench Pokémon selection modal**
- Show opponent's bench Pokémon (visible to player)
- User selects which opponent bench Pokémon to switch with opponent's active
- Return `benchPosition: 'BENCH_X'`

**Example Cards:** Gust of Wind

---

### CURE_STATUS
**Effect Type:** `CURE_STATUS`  
**Description:** Remove status conditions from Pokémon (e.g., Full Heal)  
**Target Types:** `ALL_YOURS`, `ACTIVE_YOURS`, `ALL_OPPONENTS`, `ACTIVE_OPPONENT`  
**Value:** N/A

**Required actionData:**
```typescript
{
  cardId: string;
  target: string; // 'ACTIVE' | 'BENCH_0' | 'BENCH_1' | etc.
}
```

**Client UI Required:**
- **If `target === ALL_YOURS`:** Open **player's** active and bench Pokémon selection modal
  - Show active Pokémon (if exists)
  - Show all bench Pokémon (if any)
  - Show Pokémon with status conditions highlighted
  - User selects which Pokémon to cure
  - Return `target: 'ACTIVE'` or `target: 'BENCH_X'`
- **If `target === ACTIVE_YOURS`:** Open **player's** active Pokémon selection modal
  - Show only active Pokémon (hide bench)
  - Show active Pokémon with status conditions highlighted
  - User selects active Pokémon
  - Return `target: 'ACTIVE'`
- **If `target === ALL_OPPONENTS`:** Open **opponent's** active and bench Pokémon selection modal
  - Show opponent's active Pokémon (if exists)
  - Show opponent's bench Pokémon (if any)
  - Show opponent's Pokémon with status conditions visible
  - User selects which Pokémon to cure
  - Return `target: 'ACTIVE'` or `target: 'BENCH_X'`
- **If `target === ACTIVE_OPPONENT`:** Open **opponent's** active Pokémon selection modal
  - Show only opponent's active Pokémon (hide bench)
  - Show opponent's active Pokémon with status conditions visible
  - User selects opponent's active Pokémon
  - Return `target: 'ACTIVE'`

**Example Cards:** Full Heal

---

### DISCARD_ENERGY
**Effect Type:** `DISCARD_ENERGY`  
**Description:** Discard energy from own Pokémon (e.g., Super Potion cost)  
**Target Types:** `ALL_YOURS`, `ACTIVE_YOURS`  
**Value:** Number of energy cards to discard (typically 1)

**Required actionData:**
```typescript
{
  cardId: string;
  target: string; // 'ACTIVE' | 'BENCH_0' | 'BENCH_1' | etc.
  energyCardId: string; // ID of energy card to discard
}
```

**Client UI Required:**
- Open **player's** active and bench Pokémon selection modal
- After selecting Pokémon, show that Pokémon's attached energy cards
- User selects which energy card to discard
- Return `target: 'ACTIVE'` or `target: 'BENCH_X'` and `energyCardId`

**Example Cards:** Super Potion (cost), Super Energy Removal (cost)

---

### RETURN_TO_HAND
**Effect Type:** `RETURN_TO_HAND`  
**Description:** Return Pokémon to hand (e.g., Scoop Up)  
**Target Types:** `ALL_YOURS`, `ACTIVE_YOURS`, `BENCHED_YOURS`  
**Value:** N/A

**Required actionData:**
```typescript
{
  cardId: string;
  target: string; // 'ACTIVE' | 'BENCH_0' | 'BENCH_1' | etc.
}
```

**Client UI Required:**
- Open **player's** active and bench Pokémon selection modal
- Show active Pokémon and all bench Pokémon
- User selects which Pokémon to return to hand
- Return `target: 'ACTIVE'` or `target: 'BENCH_X'`
- **Note:** If active is returned, must have bench Pokémon to replace

**Example Cards:** Scoop Up

---

### EVOLVE_POKEMON
**Effect Type:** `EVOLVE_POKEMON`  
**Description:** Force evolution (e.g., Pokémon Breeder)  
**Target Types:** `ALL_YOURS`, `ACTIVE_YOURS`, `BENCHED_YOURS`  
**Value:** N/A

**Required actionData:**
```typescript
{
  cardId: string;
  target: string; // 'ACTIVE' | 'BENCH_0' | 'BENCH_1' | etc.
  evolutionCardId: string; // Evolution card ID from hand
}
```

**Client UI Required:**
- Open **player's** active and bench Pokémon selection modal
- User selects which Pokémon to evolve
- Then open **hand selection modal** showing evolution cards
- User selects evolution card from hand
- Return `target: 'ACTIVE'` or `target: 'BENCH_X'` and `evolutionCardId`

**Example Cards:** Pokémon Breeder

---

### DEVOLVE_POKEMON
**Effect Type:** `DEVOLVE_POKEMON`  
**Description:** Devolve Pokémon (e.g., Devolution Spray)  
**Target Types:** `ALL_YOURS`  
**Value:** N/A

**Required actionData:**
```typescript
{
  cardId: string;
  target: string; // 'ACTIVE' | 'BENCH_0' | 'BENCH_1' | etc.
}
```

**Client UI Required:**
- Open **player's** active and bench Pokémon selection modal
- Show only evolved Pokémon (can filter)
- User selects which evolved Pokémon to devolve
- Return `target: 'ACTIVE'` or `target: 'BENCH_X'`
- **Note:** Currently not fully implemented (requires evolution chain data)

**Example Cards:** Devolution Spray

---

### PUT_INTO_PLAY
**Effect Type:** `PUT_INTO_PLAY`  
**Description:** Put Pokémon from discard pile to bench (e.g., Revive, Pokémon Flute)  
**Target Types:** `BENCHED_YOURS`, `BENCHED_OPPONENTS`, `ALL_YOURS`, `ALL_OPPONENTS`  
**Value:** N/A  
**Source:** `"DISCARD"` (default, player's discard) or `"OPPONENT_DISCARD"` (opponent's discard)

**Required actionData:**
```typescript
{
  cardId: string;
  target: string; // 'BENCH_0' | 'BENCH_1' | etc. (bench position)
  pokemonCardId: string; // Pokémon card ID from discard pile
}
```

**Client UI Required:**
1. **Discard Pile Selection:**
   - **Determine source discard pile:**
     - If `effect.source === "OPPONENT_DISCARD"` or not specified but `effect.target === BENCHED_OPPONENTS`: Open **opponent's discard pile modal**
     - Otherwise (default): Open **player's discard pile modal**
   - Filter/show only Pokémon cards (may be filtered by `cardType` if specified, e.g., "Basic Pokemon")
   - User selects Pokémon card from the appropriate discard pile
   - Return `pokemonCardId`

2. **Bench Position Selection:**
   - **Determine target bench:**
     - If `effect.target === BENCHED_OPPONENTS` or `ALL_OPPONENTS`: Show **opponent's bench** positions
     - Otherwise: Show **player's bench** positions
   - Show available bench positions (BENCH_0 through BENCH_4)
   - User selects bench position
   - Return `target: 'BENCH_X'`
   - **Note:** Target bench must have space (max 5)

**Selection Type:** `DISCARD_PILE` + `BENCH_POKEMON`

**Example Cards:**
- **Revive** (`source: "DISCARD"`, `target: BENCHED_YOURS`): Put Pokémon from your discard pile onto your bench
- **Pokémon Flute** (`source: "OPPONENT_DISCARD"`, `target: BENCHED_OPPONENTS`): Put Basic Pokémon from opponent's discard pile onto their bench

---

### ATTACH_TO_POKEMON
**Effect Type:** `ATTACH_TO_POKEMON`  
**Description:** Attach tool card to Pokémon (e.g., Defender, PlusPower)  
**Target Types:** `ALL_YOURS`, `ACTIVE_YOURS`  
**Value:** N/A

**Required actionData:**
```typescript
{
  cardId: string;
  target: string; // 'ACTIVE' | 'BENCH_0' | 'BENCH_1' | etc.
}
```

**Client UI Required:**
- **Pokémon Selection:**
  - **If `target === ALL_YOURS`:** Open **player's** active and bench Pokémon selection modal
    - Show active Pokémon (if exists)
    - Show all bench Pokémon (if any)
    - User selects which Pokémon to attach tool to
  - **If `target === ACTIVE_YOURS`:** Open **player's** active Pokémon selection modal
    - Show only active Pokémon (hide bench)
    - User selects active Pokémon
  - Return `target: 'ACTIVE'` or `target: 'BENCH_X'`

**Selection Type:** `BENCH_POKEMON` (note: despite the name, this selection type handles both active and bench Pokémon based on the `target` filter)

**Example Cards:** Defender, PlusPower

---

### RETRIEVE_FROM_DISCARD
**Effect Type:** `RETRIEVE_FROM_DISCARD`  
**Description:** Generic retrieve cards from discard pile  
**Target Types:** `SELF`  
**Value:** Maximum number of cards to retrieve (optional)

**Required actionData:**
```typescript
{
  cardId: string;
  selectedCardIds: string[]; // Array of card IDs to retrieve
}
```

**Client UI Required:**
- Open **discard pile modal** showing all cards
- User selects cards to retrieve (up to `value` if specified)
- Return `selectedCardIds: ['card-id-1', 'card-id-2']`
- Cards are added to hand

**Example Cards:** Various retrieval cards

---

### TRADE_CARDS
**Effect Type:** `TRADE_CARDS`  
**Description:** Trade cards from hand with deck (e.g., Pokémon Trader)  
**Target Types:** `SELF`  
**Value:** N/A

**Required actionData:**
```typescript
{
  cardId: string;
  discardCardIds: string[]; // Cards from hand to discard
  selectedCardIds: string[]; // Cards from deck to add to hand
}
```

**Client UI Required:**
- **Step 1:** Open **hand selection modal**
  - User selects cards from hand to discard
  - Return `discardCardIds: ['card-id-1', 'card-id-2']`
- **Step 2:** Open **deck modal** with all cards visible
  - User selects cards from deck to add to hand
  - Return `selectedCardIds: ['card-id-3', 'card-id-4']`
- Cards are swapped: hand cards → discard, deck cards → hand

**Example Cards:** Pokémon Trader

---

### OPPONENT_DRAWS
**Effect Type:** `OPPONENT_DRAWS`  
**Description:** Opponent draws cards (e.g., Impostor Oak)  
**Target Types:** `SELF`  
**Value:** Number of cards opponent draws

**Required actionData:**
```typescript
{
  cardId: string;
  // No additional fields needed
}
```

**Client UI Required:**
- **No UI needed** - effect is automatic
- Opponent draws cards automatically
- Client should show notification that opponent drew cards

**Example Cards:** Impostor Oak

---

### OPPONENT_SHUFFLES_HAND
**Effect Type:** `OPPONENT_SHUFFLES_HAND`  
**Description:** Opponent shuffles hand into deck (e.g., Impostor Oak)  
**Target Types:** `SELF`  
**Value:** N/A

**Required actionData:**
```typescript
{
  cardId: string;
  // No additional fields needed
}
```

**Client UI Required:**
- **No UI needed** - effect is automatic
- Opponent's hand is shuffled into their deck automatically
- Client should show notification

**Example Cards:** Impostor Oak

---

### OPPONENT_DISCARDS
**Effect Type:** `OPPONENT_DISCARDS`  
**Description:** Opponent discards cards  
**Target Types:** `SELF`  
**Value:** Number of cards opponent discards

**Required actionData:**
```typescript
{
  cardId: string;
  handCardId: string; // Card ID from opponent's hand (if player chooses)
}
```

**Client UI Required:**
- **If player chooses:** Open **opponent's hand selection modal** (if visible)
  - Show opponent's hand cards (if revealed)
  - User selects card(s) for opponent to discard
  - Return `handCardId`
- **If automatic:** No UI needed, opponent discards automatically
- **Note:** Typically opponent chooses, but some cards may let player choose

**Example Cards:** Various opponent manipulation cards

---

### LOOK_AT_DECK
**Effect Type:** `LOOK_AT_DECK`  
**Description:** Look at top cards of deck (informational only - **read-only, no selection required**)  
**Target Types:** `SELF`  
**Value:** Number of cards to look at (optional)

**Required actionData:**
```typescript
{
  cardId: string;
  // No additional fields needed
}
```

**Client UI Required:**
- Open **deck modal** showing top `value` cards (or all if no value)
- Cards are visible but **not selectable** (read-only view)
- **No state changes** - informational only
- User can close modal after viewing
- **Note:** This effect does NOT require user selection - it's purely informational

**Selection Type:** None (automatic/informational)

**Example Cards:** Various deck inspection cards

---

## Not Yet Implemented

### INCREASE_DAMAGE
**Effect Type:** `INCREASE_DAMAGE`  
**Status:** Not implemented (requires damage modifier tracking)  
**Description:** Increase damage dealt (e.g., PlusPower)

### REDUCE_DAMAGE
**Effect Type:** `REDUCE_DAMAGE`  
**Status:** Not implemented (requires damage modifier tracking)  
**Description:** Reduce damage taken (e.g., Defender)

---

## Target Type Reference

### Player Targets
- `SELF` - Self (no Pokémon selection needed)
- `ALL_YOURS` - Any of your Pokémon (active or bench)
- `ACTIVE_YOURS` - Your active Pokémon only
- `BENCHED_YOURS` - Your bench Pokémon only

### Opponent Targets
- `ALL_OPPONENTS` - Any opponent Pokémon (active or bench)
- `ACTIVE_OPPONENT` - Opponent's active Pokémon only
- `BENCHED_OPPONENTS` - Opponent's bench Pokémon only
- `DEFENDING` - Defending Pokémon (typically active)

---

## Multiple Effects

Some trainer cards have **multiple effects** that execute in sequence. The client should handle each effect's UI requirements:

**Example: Energy Retrieval**
1. `DISCARD_HAND` - Select card from hand to discard
2. `RETRIEVE_ENERGY` - Select energy cards from discard pile

**Example: Computer Search**
1. `DISCARD_HAND` - Select 2 cards from hand to discard
2. `SEARCH_DECK` - Search deck and select 1 card
3. `SHUFFLE_DECK` - Deck is shuffled automatically

**Example: Super Potion**
1. `DISCARD_ENERGY` - Select energy from your Pokémon to discard
2. `HEAL` - Select Pokémon to heal

---

## Implementation Tips

1. **Read `trainerEffects` from card metadata** - Don't hardcode card IDs
2. **Check `effect.target`** - Determines which modals to show (player vs opponent) and **filters what's displayed**:
   - `ALL_YOURS` / `ALL_OPPONENTS` → Show both active and bench
   - `ACTIVE_YOURS` / `ACTIVE_OPPONENT` → Show only active (hide bench)
   - `BENCHED_YOURS` / `BENCHED_OPPONENTS` → Show only bench (hide active)
3. **Check `effect.source`** - For effects like `PUT_INTO_PLAY`, determines which discard pile to show:
   - `"DISCARD"` or undefined = player's discard pile (default)
   - `"OPPONENT_DISCARD"` = opponent's discard pile
   - Other sources may be added in the future (`"HAND"`, `"DECK"`, etc.)
4. **Check `effect.value`** - May indicate limits (max cards to select, heal amount, etc.)
5. **Handle multiple effects** - Show UI for each effect in sequence
6. **Validate selections** - Server validates, but client can pre-validate for better UX
7. **Show appropriate modals** - Use target type and source to determine which Pokémon/cards to show
8. **Handle empty selections** - Some effects allow empty arrays (e.g., RETRIEVE_ENERGY can retrieve 0 cards)

---

## Summary Table

| Effect Type | Requires Selection | Modal Type | Target Scope |
|------------|-------------------|------------|--------------|
| HEAL | Yes | Pokémon Selection | Player or Opponent |
| REMOVE_ENERGY | Yes | Pokémon + Energy Selection | Opponent |
| RETRIEVE_ENERGY | Yes | Hand + Discard Pile | Self |
| DISCARD_HAND | Yes | Hand Selection | Self |
| DRAW_CARDS | No | None (automatic) | Self |
| SHUFFLE_DECK | No | None (automatic) | Self |
| SEARCH_DECK | Yes | Deck Selection | Self |
| SWITCH_ACTIVE | Yes | Bench Selection | Player |
| FORCE_SWITCH | Yes | Bench Selection | Opponent |
| CURE_STATUS | Yes | Pokémon Selection | Player or Opponent |
| DISCARD_ENERGY | Yes | Pokémon + Energy Selection | Player |
| RETURN_TO_HAND | Yes | Pokémon Selection | Player |
| EVOLVE_POKEMON | Yes | Pokémon + Hand Selection | Player |
| DEVOLVE_POKEMON | Yes | Pokémon Selection | Player |
| PUT_INTO_PLAY | Yes | DISCARD_PILE + BENCH_POKEMON | Player or Opponent (depends on source & target) |
| ATTACH_TO_POKEMON | Yes | BENCH_POKEMON | Player |
| RETRIEVE_FROM_DISCARD | Yes | Discard Pile Selection | Self |
| TRADE_CARDS | Yes | Hand + Deck Selection | Self |
| OPPONENT_DRAWS | No | None (automatic) | Opponent |
| OPPONENT_SHUFFLES_HAND | No | None (automatic) | Opponent |
| OPPONENT_DISCARDS | Maybe | Hand Selection (if player chooses) | Opponent |
| LOOK_AT_DECK | No | Deck View (read-only, no selection) | Self |

