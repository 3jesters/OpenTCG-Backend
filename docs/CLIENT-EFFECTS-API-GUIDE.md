# Client Effects API Guide

This document describes all API changes, object/enum updates, request/response formats, and error messages related to the new status effects, damage modifiers, and damage prevention/reduction mechanics.

## Table of Contents

1. [API Endpoints](#api-endpoints)
2. [Data Structures](#data-structures)
3. [Enums](#enums)
4. [Request/Response Examples](#requestresponse-examples)
5. [Error Messages](#error-messages)
6. [State Machine Changes](#state-machine-changes)

## API Endpoints

### POST `/api/v1/matches/:matchId/actions`

**No changes to request format** - existing `ExecuteActionRequestDto` structure remains the same.

**Response changes:**
- `MatchStateResponseDto` now includes updated status effect information
- `coinFlipState` may include new `STATUS_CHECK` context for sleep wake-up and confusion checks
- `availableActions` may exclude `ATTACK` based on status effects

### POST `/api/v1/matches/:matchId/state`

**Response changes:**
- `playerState.activePokemon.statusEffect` - Now includes all status effects (POISONED, CONFUSED, ASLEEP, PARALYZED, BURNED)
- `playerState.activePokemon.poisonDamageAmount` - New optional field (10 or 20)
- `playerState.activePokemon.damageCounters` - Now calculated from `maxHp - currentHp` (no longer stored)
- `coinFlipState` - May include `STATUS_CHECK` context

## Data Structures

### PokemonInPlayDto

```typescript
{
  instanceId: string;
  cardId: CardId;
  position: string;
  currentHp: number;
  maxHp: number;
  attachedEnergy: CardId[];
  statusEffect: string; // StatusEffect enum value
  damageCounters: number; // Calculated: maxHp - currentHp
  poisonDamageAmount?: number; // Optional: 10 or 20, only present if POISONED
}
```

**Changes:**
- `damageCounters` is now calculated from HP values (not stored)
- `poisonDamageAmount` is new, optional field (only present when `statusEffect === 'POISONED'`)

### CoinFlipState

```typescript
{
  status: CoinFlipStatus; // READY_TO_FLIP, FLIP_RESULT, COMPLETED
  context: CoinFlipContext; // ATTACK or STATUS_CHECK (new)
  configuration: CoinFlipConfiguration;
  results: CoinFlipResult[];
  attackIndex?: number; // For ATTACK context
  pokemonInstanceId?: string; // For STATUS_CHECK context (new)
  statusEffect?: string; // For STATUS_CHECK context: 'ASLEEP' or 'CONFUSED' (new)
  actionId?: string;
  player1HasApproved: boolean;
  player2HasApproved: boolean;
}
```

**Changes:**
- `context` can now be `STATUS_CHECK` (new)
- `pokemonInstanceId` and `statusEffect` fields added for STATUS_CHECK context

## Enums

### StatusEffect

```typescript
enum StatusEffect {
  NONE = 'NONE',
  ASLEEP = 'ASLEEP',
  CONFUSED = 'CONFUSED',
  PARALYZED = 'PARALYZED',
  POISONED = 'POISONED',
  BURNED = 'BURNED',
}
```

**No changes** - enum already existed, now actively used.

### CoinFlipContext

```typescript
enum CoinFlipContext {
  ATTACK = 'ATTACK', // Existing - coin flip for attack damage/effects
  STATUS_CHECK = 'STATUS_CHECK', // New - coin flip for status effect checks
}
```

**Changes:**
- `STATUS_CHECK` is new context for sleep wake-up and confusion checks

### CoinFlipStatus

```typescript
enum CoinFlipStatus {
  READY_TO_FLIP = 'READY_TO_FLIP',
  FLIP_RESULT = 'FLIP_RESULT',
  COMPLETED = 'COMPLETED',
}
```

**No changes** - enum already existed.

## Request/Response Examples

### Example 1: Attack with Status Effect (Confused)

**Request:**
```json
POST /api/v1/matches/:matchId/actions
{
  "playerId": "player-1",
  "actionType": "ATTACK",
  "actionData": {
    "attackIndex": 0
  }
}
```

**Response (after attack succeeds):**
```json
{
  "matchId": "...",
  "playerState": {
    "activePokemon": {
      "instanceId": "...",
      "cardId": "...",
      "currentHp": 100,
      "maxHp": 100,
      "statusEffect": "NONE",
      "damageCounters": 0
    },
    ...
  },
  "opponentState": {
    "activePokemon": {
      "instanceId": "...",
      "cardId": "...",
      "currentHp": 70,
      "maxHp": 100,
      "statusEffect": "CONFUSED",
      "damageCounters": 30
    },
    ...
  },
  "coinFlipState": null,
  "availableActions": ["END_TURN", "ATTACK", ...]
}
```

### Example 2: Confused Pokemon Attempts Attack

**Request:**
```json
POST /api/v1/matches/:matchId/actions
{
  "playerId": "player-1",
  "actionType": "ATTACK",
  "actionData": {
    "attackIndex": 0
  }
}
```

**Response (coin flip required):**
```json
{
  "matchId": "...",
  "playerState": {
    "activePokemon": {
      "statusEffect": "CONFUSED",
      ...
    },
    ...
  },
  "coinFlipState": {
    "status": "READY_TO_FLIP",
    "context": "STATUS_CHECK",
    "pokemonInstanceId": "instance-123",
    "statusEffect": "CONFUSED",
    "results": [],
    ...
  },
  "availableActions": ["GENERATE_COIN_FLIP", "END_TURN", ...]
}
```

**Next Request (flip coin):**
```json
POST /api/v1/matches/:matchId/actions
{
  "playerId": "player-1",
  "actionType": "GENERATE_COIN_FLIP",
  "actionData": {}
}
```

**Response (if tails - attack fails):**
```json
{
  "matchId": "...",
  "playerState": {
    "activePokemon": {
      "instanceId": "instance-123",
      "currentHp": 70, // Reduced by 30
      "maxHp": 100,
      "statusEffect": "CONFUSED", // Still confused
      "damageCounters": 30
    },
    ...
  },
  "coinFlipState": null,
  "lastAction": {
    "actionType": "ATTACK",
    "actionData": {
      "confusionFailed": true,
      "selfDamage": 30,
      "isKnockedOut": false
    }
  },
  "availableActions": ["END_TURN", ...]
}
```

### Example 3: Sleep Wake-Up at Turn Start

**Response (at start of turn with asleep Pokemon):**
```json
{
  "matchId": "...",
  "playerState": {
    "activePokemon": {
      "statusEffect": "ASLEEP",
      ...
    },
    ...
  },
  "coinFlipState": {
    "status": "READY_TO_FLIP",
    "context": "STATUS_CHECK",
    "pokemonInstanceId": "instance-456",
    "statusEffect": "ASLEEP",
    "results": [],
    ...
  },
  "availableActions": ["GENERATE_COIN_FLIP", "CONCEDE"],
  "phase": "DRAW"
}
```

**Request (flip coin):**
```json
POST /api/v1/matches/:matchId/actions
{
  "playerId": "player-1",
  "actionType": "GENERATE_COIN_FLIP",
  "actionData": {}
}
```

**Response (if heads - wakes up):**
```json
{
  "matchId": "...",
  "playerState": {
    "activePokemon": {
      "statusEffect": "NONE", // Woke up
      ...
    },
    ...
  },
  "coinFlipState": null,
  "availableActions": ["DRAW_CARD", "ATTACK", ...],
  "phase": "DRAW"
}
```

### Example 4: Poison Damage Between Turns

**Response (after END_TURN, before next player's turn):**
```json
{
  "matchId": "...",
  "playerState": {
    "activePokemon": {
      "currentHp": 90, // Reduced from 100
      "maxHp": 100,
      "statusEffect": "POISONED",
      "poisonDamageAmount": 10,
      "damageCounters": 10
    },
    ...
  },
  "lastAction": {
    "actionType": "END_TURN",
    ...
  }
}
```

## Error Messages

### Status Effect Related Errors

1. **Cannot attack while Asleep:**
   ```
   Error: Cannot attack while Asleep. Flip a coin to wake up first.
   ```
   **When:** Player attempts to attack with an asleep Pokemon that doesn't have a coin flip state.

2. **Must resolve sleep coin flip:**
   ```
   Error: Must resolve sleep coin flip before attacking.
   ```
   **When:** Player attempts to attack while sleep wake-up coin flip is pending.

3. **Cannot attack while Paralyzed:**
   ```
   Error: Cannot attack while Paralyzed.
   ```
   **When:** Player attempts to attack with a paralyzed Pokemon.

4. **Must resolve confusion coin flip:**
   ```
   Error: Must resolve confusion coin flip before attacking.
   ```
   **When:** Player attempts to attack while confusion coin flip is pending.

5. **Confusion attack failed:**
   ```
   Error: Confusion coin flip failed. Pokemon takes 30 self-damage and cannot attack this turn.
   ```
   **When:** Confusion coin flip results in tails (handled automatically, but error message in action data).

## State Machine Changes

### Available Actions by Status Effect

#### ASLEEP Pokemon
- **Before coin flip:** `availableActions` includes `GENERATE_COIN_FLIP`, excludes `ATTACK`
- **After coin flip (heads):** `availableActions` includes `ATTACK` (if other conditions met)
- **After coin flip (tails):** `availableActions` excludes `ATTACK`

#### PARALYZED Pokemon
- `availableActions` **always excludes** `ATTACK`
- Paralyzed status clears automatically at end of turn

#### CONFUSED Pokemon
- `availableActions` includes `ATTACK` (but attack will require coin flip)
- When attack attempted, `coinFlipState` is created with `STATUS_CHECK` context
- After coin flip (heads): Attack proceeds
- After coin flip (tails): Attack fails, 30 self-damage applied

#### POISONED/BURNED Pokemon
- `availableActions` unchanged (no attack blocking)
- Damage applied automatically between turns

#### Normal Pokemon
- `availableActions` includes `ATTACK` (if conditions met)

### Phase Restrictions

- **DRAW phase:** If active Pokemon is ASLEEP, `GENERATE_COIN_FLIP` is required before `DRAW_CARD`
- **MAIN_PHASE/ATTACK phase:** Status effects may block `ATTACK` action

## Action Flow Summary

### Sleep Wake-Up Flow
1. Turn starts (DRAW phase)
2. If active Pokemon is ASLEEP, `coinFlipState` created automatically
3. Client must call `GENERATE_COIN_FLIP`
4. If heads: Pokemon wakes up, normal turn proceeds
5. If tails: Pokemon stays asleep, `ATTACK` blocked

### Confusion Attack Flow
1. Player attempts `ATTACK` with confused Pokemon
2. Server creates `coinFlipState` with `STATUS_CHECK` context
3. Client must call `GENERATE_COIN_FLIP`
4. If heads: Attack proceeds normally
5. If tails: Attack fails, 30 self-damage applied, Pokemon remains confused

### Poison/Burn Damage Flow
1. Player calls `END_TURN`
2. Server processes between-turns effects
3. Poison/burn damage applied automatically
4. Updated match state returned with reduced HP

## Backward Compatibility

- `damageCounters` field still present in responses (calculated, not stored)
- Existing API endpoints unchanged
- New fields (`poisonDamageAmount`, `coinFlipState.statusEffect`, `coinFlipState.pokemonInstanceId`) are optional
- Clients that don't handle new status effects will still receive valid responses (may just not display status correctly)

