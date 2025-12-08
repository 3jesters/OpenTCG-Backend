# Client Coin Flip System Guide

## Overview

The coin flip system allows players to interact with coin flip mechanics during attacks and other game events. The system uses a two-stage flow: **READY_TO_FLIP** (waiting for player action) and **COMPLETED** (results applied).

## Detecting Coin Flip State

### Check `coinFlipState` in Match State Response

When you receive a match state response, check if `coinFlipState` exists:

```typescript
interface MatchStateResponse {
  // ... other fields
  coinFlipState?: CoinFlipStateDto | null;
  availableActions: string[];
  // ... other fields
}

interface CoinFlipStateDto {
  status: 'READY_TO_FLIP' | 'FLIP_RESULT' | 'COMPLETED';
  context: 'ATTACK' | 'STATUS_CHECK' | 'ABILITY' | 'TRAINER';
  configuration: {
    countType: 'FIXED' | 'UNTIL_TAILS' | 'VARIABLE';
    fixedCount?: number; // Number of coins to flip (for FIXED countType)
    damageCalculationType: 'BASE_DAMAGE' | 'MULTIPLY_BY_HEADS' | 'CONDITIONAL_BONUS' | 'CONDITIONAL_SELF_DAMAGE';
    baseDamage: number; // Base damage value
    damagePerHead?: number; // Damage per head (for MULTIPLY_BY_HEADS)
    conditionalBonus?: number; // Bonus damage (for CONDITIONAL_BONUS)
    selfDamageOnTails?: number; // Self damage on tails (for CONDITIONAL_SELF_DAMAGE)
  };
  results: Array<{
    flipIndex: number;
    result: 'heads' | 'tails';
    seed: number;
  }>;
  attackIndex?: number; // For ATTACK context
  pokemonInstanceId?: string; // For STATUS_CHECK context
  statusEffect?: string; // For STATUS_CHECK context
  actionId?: string; // Action ID that initiated this coin flip
}
```

### When Coin Flip is Needed

A coin flip is required when:
1. `coinFlipState` is present and not null
2. `coinFlipState.status === 'READY_TO_FLIP'`
3. `'GENERATE_COIN_FLIP'` is in `availableActions`

## Coin Flip States

### 1. READY_TO_FLIP

**When:** Coin flip is required but not yet executed.

**What to do:**
- Show coin flip UI to the player
- Display the coin flip context (e.g., "Attack requires coin flip")
- Enable the "Flip Coin" button
- Wait for player to trigger the flip

**Example Response:**
```json
{
  "coinFlipState": {
    "status": "READY_TO_FLIP",
    "context": "ATTACK",
    "attackIndex": 0,
    "configuration": {
      "countType": "FIXED",
      "fixedCount": 1,
      "damageCalculationType": "BASE_DAMAGE",
      "baseDamage": 30,
      "damagePerHead": undefined,
      "conditionalBonus": undefined,
      "selfDamageOnTails": undefined
    },
    "results": []
  },
  "availableActions": ["GENERATE_COIN_FLIP", "CONCEDE"]
}
```

### 2. FLIP_RESULT

**When:** Coin flip has been executed but not yet processed (rare, for multi-flip scenarios).

**What to do:**
- Display the coin flip result(s)
- Show if more flips are needed
- Wait for server to complete processing

**Note:** In most cases, the system transitions directly from `READY_TO_FLIP` to `COMPLETED` (coinFlipState becomes null).

### 3. COMPLETED (coinFlipState is null)

**When:** Coin flip has been completed and results applied.

**What to do:**
- Check `lastAction.actionData.coinFlipResults` for the results
- Display the outcome to the player
- Update game state based on results

**Example Response:**
```json
{
  "coinFlipState": null,
  "lastAction": {
    "actionType": "ATTACK",
    "actionData": {
      "attackIndex": 0,
      "damage": 30,
      "coinFlipResults": [
        {
          "flipIndex": 0,
          "result": "heads",
          "seed": 1234567890
        }
      ]
    }
  }
}
```

## Client Flow

### Step 1: Detect Coin Flip Requirement

```typescript
function checkCoinFlipNeeded(matchState: MatchStateResponse): boolean {
  return (
    matchState.coinFlipState !== null &&
    matchState.coinFlipState !== undefined &&
    matchState.coinFlipState.status === 'READY_TO_FLIP' &&
    matchState.availableActions.includes('GENERATE_COIN_FLIP')
  );
}
```

### Step 2: Show Coin Flip UI

When coin flip is needed, show appropriate UI:

```typescript
function renderCoinFlipUI(coinFlipState: CoinFlipStateDto) {
  let message = '';
  
  switch (coinFlipState.context) {
    case 'ATTACK':
      message = `Flip a coin for ${coinFlipState.configuration.fixedCount || 1} coin(s)`;
      break;
    case 'STATUS_CHECK':
      message = `Flip a coin to check if ${coinFlipState.statusEffect} status is removed`;
      break;
    // ... other contexts
  }
  
  // Show UI with "Flip Coin" button
  return {
    message,
    canFlip: true,
    coinFlipState
  };
}
```

### Step 3: Execute Coin Flip

When player clicks "Flip Coin", send the `GENERATE_COIN_FLIP` action:

```typescript
async function executeCoinFlip(matchId: string, playerId: string): Promise<MatchStateResponse> {
  const response = await fetch(`/api/v1/matches/${matchId}/actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playerId: playerId,
      actionType: 'GENERATE_COIN_FLIP',
      actionData: {} // No additional data needed
    })
  });
  
  return response.json();
}
```

### Step 4: Handle Coin Flip Results

After coin flip is executed, check the results:

```typescript
function handleCoinFlipResult(matchState: MatchStateResponse) {
  const lastAction = matchState.lastAction;
  
  if (lastAction?.actionType === 'ATTACK' && lastAction.actionData.coinFlipResults) {
    const results = lastAction.actionData.coinFlipResults;
    const damage = lastAction.actionData.damage;
    const attackFailed = lastAction.actionData.attackFailed;
    
    // Display results to player
    results.forEach((result, index) => {
      console.log(`Flip ${index + 1}: ${result.result}`);
    });
    
    if (attackFailed) {
      // Attack did nothing (tails)
      showMessage('Attack failed! Coin flip resulted in tails.');
    } else {
      // Attack succeeded (heads)
      showMessage(`Attack succeeded! Dealt ${damage} damage.`);
    }
  }
}
```

## Complete Example Flow

### Attack with Coin Flip

```typescript
// 1. Player selects attack
const attackResponse = await executeAction(matchId, playerId, {
  actionType: 'ATTACK',
  actionData: { attackIndex: 0 }
});

// 2. Check if coin flip is needed
if (checkCoinFlipNeeded(attackResponse)) {
  // 3. Show coin flip UI
  const coinFlipUI = renderCoinFlipUI(attackResponse.coinFlipState);
  showCoinFlipDialog(coinFlipUI);
  
  // 4. Wait for player to click "Flip Coin"
  // (In your UI event handler)
  const coinFlipResponse = await executeCoinFlip(matchId, playerId);
  
  // 5. Handle results
  handleCoinFlipResult(coinFlipResponse);
  
  // 6. Update game state
  updateGameState(coinFlipResponse);
}
```

## Coin Flip Contexts

### ATTACK Context

**When:** Attack requires coin flip before dealing damage.

**Flow:**
1. Player executes `ATTACK` action
2. Server responds with `coinFlipState.status = 'READY_TO_FLIP'`
3. Client shows coin flip UI
4. Player executes `GENERATE_COIN_FLIP` action
5. Server calculates damage based on results and applies it
6. Server responds with `coinFlipState = null` and `lastAction` containing results

**Example:**
- Nidoran♂'s "Horn Hazard": Flip 1 coin. If tails, attack does nothing (0 damage). If heads, does 30 damage.

### STATUS_CHECK Context

**When:** Status effect requires coin flip (e.g., sleep check between turns).

**Flow:**
1. Between turns, server detects status effect requiring coin flip
2. Server creates `coinFlipState` with `context = 'STATUS_CHECK'`
3. Client shows coin flip UI
4. Player executes `GENERATE_COIN_FLIP` action
5. Server updates Pokemon status based on results
6. Server responds with updated state

**Example:**
- Asleep Pokemon: Flip 1 coin. If heads, Pokemon wakes up. If tails, remains asleep.

## Damage Calculation Types

### BASE_DAMAGE

**Pattern:** "Flip a coin. If tails, this attack does nothing."

**Behavior:**
- Heads: Apply base damage
- Tails: 0 damage, `attackFailed = true`

**Example:**
```json
{
  "damageCalculationType": "BASE_DAMAGE",
  "baseDamage": 30
}
```

### MULTIPLY_BY_HEADS

**Pattern:** "Flip 2 coins. This attack does 30 damage times the number of heads."

**Behavior:**
- Damage = `damagePerHead × number of heads`
- Can result in 0 damage if all tails

**Example:**
```json
{
  "damageCalculationType": "MULTIPLY_BY_HEADS",
  "damagePerHead": 30,
  "fixedCount": 2
}
```

### CONDITIONAL_BONUS

**Pattern:** "Flip a coin. If heads, this attack does 30 damage plus 10 more damage."

**Behavior:**
- Heads: Base damage + bonus
- Tails: Base damage only

**Example:**
```json
{
  "damageCalculationType": "CONDITIONAL_BONUS",
  "baseDamage": 30,
  "conditionalBonus": 10
}
```

## Error Handling

### Invalid Coin Flip State

If you try to execute `GENERATE_COIN_FLIP` when not in `READY_TO_FLIP` state:

```json
{
  "statusCode": 400,
  "message": "Coin flip not ready. Current status: COMPLETED"
}
```

### Not Player's Turn

If opponent tries to flip coin:

```json
{
  "statusCode": 400,
  "message": "Not your turn to flip coin"
}
```

## Best Practices

### 1. Always Check Available Actions

Before showing coin flip UI, verify `'GENERATE_COIN_FLIP'` is in `availableActions`:

```typescript
if (
  matchState.coinFlipState !== null &&
  matchState.coinFlipState !== undefined &&
  matchState.coinFlipState.status === 'READY_TO_FLIP' &&
  matchState.availableActions.includes('GENERATE_COIN_FLIP')
) {
  // Show coin flip UI
}
```

### 2. Handle State Transitions

The coin flip state can transition quickly. Always check the latest state:

```typescript
// After executing GENERATE_COIN_FLIP
const updatedState = await getMatchState(matchId, playerId);

if (updatedState.coinFlipState === null) {
  // Coin flip completed, check lastAction for results
  handleCoinFlipResult(updatedState);
}
```

### 3. Display Results Clearly

Show coin flip results to the player:

```typescript
function displayCoinFlipResults(results: CoinFlipResult[]) {
  results.forEach((result, index) => {
    const emoji = result.result === 'heads' ? '🪙' : '🪙';
    const text = result.result === 'heads' ? 'Heads' : 'Tails';
    showNotification(`Flip ${index + 1}: ${emoji} ${text}`);
  });
}
```

### 4. Handle Multiple Flips

Some attacks require multiple coin flips:

```typescript
if (coinFlipState.configuration.fixedCount > 1) {
  // Show UI indicating multiple flips will occur
  showMessage(`Flipping ${coinFlipState.configuration.fixedCount} coins...`);
}
```

## Polling for Opponent's Coin Flip

When it's your opponent's turn and they need to flip a coin:

```typescript
// Poll for state updates
setInterval(async () => {
  const state = await getMatchState(matchId, playerId);
  
  // Check if opponent completed coin flip
  if (
    state.coinFlipState === null &&
    state.lastAction?.actionType === 'ATTACK' &&
    state.lastAction.actionData.coinFlipResults
  ) {
    // Opponent completed coin flip, show results
    displayOpponentCoinFlipResults(state.lastAction.actionData.coinFlipResults);
  }
}, 1000); // Poll every second
```

## Complete TypeScript Interface

```typescript
interface CoinFlipStateDto {
  status: 'READY_TO_FLIP' | 'FLIP_RESULT' | 'COMPLETED';
  context: 'ATTACK' | 'STATUS_CHECK' | 'ABILITY' | 'TRAINER';
  configuration: {
    countType: 'FIXED' | 'UNTIL_TAILS' | 'VARIABLE';
    fixedCount?: number; // For FIXED countType
    damageCalculationType: 'BASE_DAMAGE' | 'MULTIPLY_BY_HEADS' | 'CONDITIONAL_BONUS' | 'CONDITIONAL_SELF_DAMAGE';
    baseDamage: number;
    damagePerHead?: number; // For MULTIPLY_BY_HEADS
    conditionalBonus?: number; // For CONDITIONAL_BONUS
    selfDamageOnTails?: number; // For CONDITIONAL_SELF_DAMAGE
  };
  results: Array<{
    flipIndex: number;
    result: 'heads' | 'tails';
    seed: number;
  }>;
  attackIndex?: number;
  pokemonInstanceId?: string;
  statusEffect?: string;
  actionId?: string;
}

interface MatchStateResponse {
  // ... other fields
  coinFlipState?: CoinFlipStateDto | null;
  availableActions: string[];
  lastAction?: {
    actionType: string;
    actionData: {
      attackIndex?: number;
      damage?: number;
      isKnockedOut?: boolean;
      attackFailed?: boolean;
      coinFlipResults?: Array<{
        flipIndex: number;
        result: 'heads' | 'tails';
        seed: number;
      }>;
    };
  };
  // ... other fields
}
```

## Quick Reference

| State | What It Means | Client Action |
|-------|---------------|---------------|
| `coinFlipState = null` | No coin flip in progress | Normal gameplay |
| `status = 'READY_TO_FLIP'` | Coin flip needed | Show "Flip Coin" button, wait for player |
| `status = 'FLIP_RESULT'` | Flip executed, processing | Display results, wait for completion |
| `coinFlipState = null` + `lastAction.coinFlipResults` | Flip completed | Display final results, update game state |

## Example: Complete Attack with Coin Flip

```typescript
// 1. Player clicks "Attack" button
const attackResponse = await fetch('/api/v1/matches/123/actions', {
  method: 'POST',
  body: JSON.stringify({
    playerId: 'player-1',
    actionType: 'ATTACK',
    actionData: { attackIndex: 0 }
  })
});

const attackState = await attackResponse.json();

// 2. Check if coin flip needed
if (attackState.coinFlipState?.status === 'READY_TO_FLIP') {
  // 3. Show coin flip UI
  showDialog({
    title: 'Coin Flip Required',
    message: 'Flip a coin to determine if attack succeeds',
    button: 'Flip Coin',
    onConfirm: async () => {
      // 4. Execute coin flip
      const flipResponse = await fetch('/api/v1/matches/123/actions', {
        method: 'POST',
        body: JSON.stringify({
          playerId: 'player-1',
          actionType: 'GENERATE_COIN_FLIP',
          actionData: {}
        })
      });
      
      const finalState = await flipResponse.json();
      
      // 5. Display results
      const result = finalState.lastAction.actionData.coinFlipResults[0];
      if (result.result === 'heads') {
        showMessage(`Heads! Attack deals ${finalState.lastAction.actionData.damage} damage.`);
      } else {
        showMessage('Tails! Attack does nothing.');
      }
      
      // 6. Update game state
      updateGameState(finalState);
    }
  });
}
```

