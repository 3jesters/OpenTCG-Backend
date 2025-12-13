# Client Coin Flip Approval System Guide

## Overview

The coin flip approval system allows both players to see and approve coin toss results for attacks, similar to the first player selection flow. When an attack requires a coin flip, both players can see the coin flip state, and the first player to approve triggers the coin flip generation (deterministic - same result for both players). Results are automatically applied after generation (single-stage approval).

## Key Concepts

### Approval Flow

1. **Attack Executed**: Player executes `ATTACK` action
2. **Coin Flip State Created**: Server creates `coinFlipState` with `status: 'READY_TO_FLIP'` and approval flags set to `false`
3. **Both Players See State**: Both players can see the coin flip UI and have `GENERATE_COIN_FLIP` in their available actions
4. **First Approval**: First player to approve triggers coin flip generation (deterministic)
5. **Results Visible**: Both players see the same coin flip results immediately
6. **Results Applied**: Results are automatically applied (single-stage approval)

### Multiple Coin Flips

- **Fixed Count** (e.g., "Flip 2 coins"): All flips generated at once, client displays sequentially
- **Until Tails** (e.g., "Flip until tails"): Server generates flips sequentially until tails appears (or max limit), all results stored immediately, client displays sequentially

## API Response Structure

### CoinFlipStateDto

```typescript
interface CoinFlipStateDto {
  status: 'READY_TO_FLIP' | 'FLIP_RESULT' | 'COMPLETED';
  context: 'ATTACK' | 'STATUS_CHECK' | 'ABILITY' | 'TRAINER';
  configuration: {
    countType: 'FIXED' | 'UNTIL_TAILS' | 'VARIABLE';
    fixedCount?: number;
    damageCalculationType: 'BASE_DAMAGE' | 'MULTIPLY_BY_HEADS' | 'CONDITIONAL_BONUS' | 'CONDITIONAL_SELF_DAMAGE';
    baseDamage: number;
    damagePerHead?: number;
    conditionalBonus?: number;
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
  player1HasApproved: boolean;  // NEW: Approval tracking
  player2HasApproved: boolean;  // NEW: Approval tracking
}
```

## Client Implementation

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

### Step 2: Show Coin Flip UI to Both Players

When coin flip is needed, show appropriate UI to both players:

```typescript
function renderCoinFlipUI(coinFlipState: CoinFlipStateDto, playerId: string, isPlayer1: boolean) {
  const hasApproved = isPlayer1 
    ? coinFlipState.player1HasApproved 
    : coinFlipState.player2HasApproved;
  const opponentHasApproved = isPlayer1
    ? coinFlipState.player2HasApproved
    : coinFlipState.player1HasApproved;

  let message = '';
  
  switch (coinFlipState.context) {
    case 'ATTACK':
      if (coinFlipState.configuration.fixedCount) {
        message = `Flip ${coinFlipState.configuration.fixedCount} coin(s) for this attack`;
      } else if (coinFlipState.configuration.countType === 'UNTIL_TAILS') {
        message = 'Flip coins until tails appears';
      } else {
        message = 'Flip a coin for this attack';
      }
      break;
    // ... other contexts
  }
  
  return {
    message,
    canApprove: !hasApproved && coinFlipState.results.length === 0, // Can approve if not approved and no results yet
    hasApproved,
    opponentHasApproved,
    results: coinFlipState.results, // Empty initially, populated after first approval
    coinFlipState
  };
}
```

### Step 3: Handle Approval

When player clicks "Approve" or "Flip Coin":

```typescript
async function approveCoinFlip(matchId: string, playerId: string): Promise<MatchStateResponse> {
  const response = await fetch(`/api/v1/matches/${matchId}/actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playerId: playerId,
      actionType: 'GENERATE_COIN_FLIP',
      actionData: {} // No additional data needed
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
  
  return response.json();
}
```

### Step 4: Display Results Sequentially

After approval, coin flip results are generated. Display them sequentially:

```typescript
async function displayCoinFlipsSequentially(
  results: Array<{ flipIndex: number; result: 'heads' | 'tails'; seed: number }>,
  onComplete: () => void
) {
  for (let i = 0; i < results.length; i++) {
    await showCoinFlipAnimation(results[i]); // Animate flip i
    await delay(1000); // Wait 1 second between flips
  }
  onComplete(); // All flips shown, proceed with game state update
}

function showCoinFlipAnimation(result: { flipIndex: number; result: 'heads' | 'tails' }) {
  return new Promise((resolve) => {
    // Show coin flip animation
    // Update UI to show result (heads/tails)
    // Resolve after animation completes
    setTimeout(resolve, 1500); // Example: 1.5s animation
  });
}
```

### Step 5: Handle Results

After coin flip is executed, check the results in `lastAction`:

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
      // Attack succeeded
      showMessage(`Attack succeeded! Dealt ${damage} damage.`);
    }
  }
}
```

## Complete Example Flow

### Attack with Coin Flip (Vulpix Confuse Ray)

```typescript
// 1. Player selects attack
const attackResponse = await executeAction(matchId, playerId, {
  actionType: 'ATTACK',
  actionData: { attackIndex: 0 } // Confuse Ray
});

// 2. Check if coin flip is needed
if (checkCoinFlipNeeded(attackResponse)) {
  // 3. Show coin flip UI to both players
  const coinFlipUI = renderCoinFlipUI(
    attackResponse.coinFlipState,
    playerId,
    isPlayer1
  );
  showCoinFlipDialog(coinFlipUI);
  
  // 4. Wait for player to click "Approve" or "Flip Coin"
  // (In your UI event handler)
  const approveResponse = await approveCoinFlip(matchId, playerId);
  
  // 5. Check if results are generated
  if (approveResponse.coinFlipState?.results.length > 0) {
    // 6. Display results sequentially
    await displayCoinFlipsSequentially(
      approveResponse.coinFlipState.results,
      () => {
        // 7. Handle final results
        handleCoinFlipResult(approveResponse);
        
        // 8. Update game state
        updateGameState(approveResponse);
      }
    );
  } else {
    // Still waiting for opponent or results not yet generated
    // Poll for updates
    pollForCoinFlipResults(matchId, playerId);
  }
}
```

## State Transitions

### READY_TO_FLIP (Initial State)

- **When**: Attack requires coin flip, coin flip state created
- **What to do**: 
  - Show coin flip UI to both players
  - Display "Approve" or "Flip Coin" button
  - Wait for first player to approve

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
      "baseDamage": 10
    },
    "results": [],
    "player1HasApproved": false,
    "player2HasApproved": false
  },
  "availableActions": ["GENERATE_COIN_FLIP", "CONCEDE"]
}
```

### After First Approval (Results Generated)

- **When**: First player approves, coin flip generated
- **What to do**:
  - Display coin flip results sequentially
  - Results are automatically applied
  - Update game state

**Example Response:**
```json
{
  "coinFlipState": null,
  "lastAction": {
    "actionType": "ATTACK",
    "actionData": {
      "attackIndex": 0,
      "damage": 10,
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

## Multiple Coin Flips

### Fixed Count (e.g., "Flip 2 coins")

```typescript
// After first approval, all flips are generated at once
const approveResponse = await approveCoinFlip(matchId, playerId);

if (approveResponse.coinFlipState?.results.length > 0) {
  // Display all results sequentially
  await displayCoinFlipsSequentially(
    approveResponse.coinFlipState.results, // e.g., [heads, tails]
    () => {
      // Results applied automatically
      handleCoinFlipResult(approveResponse);
    }
  );
}
```

### Until Tails

```typescript
// After first approval, flips generated until tails (or max limit)
const approveResponse = await approveCoinFlip(matchId, playerId);

if (approveResponse.coinFlipState?.results.length > 0) {
  // Results stop at first tails
  // e.g., [heads, heads, tails] - 2 heads counted
  await displayCoinFlipsSequentially(
    approveResponse.coinFlipState.results,
    () => {
      handleCoinFlipResult(approveResponse);
    }
  );
}
```

## UX Patterns

### Similar to First Player Selection

The coin flip approval flow follows the same UX pattern as first player selection:

1. **Both players see the same state**
2. **First player to approve triggers the action**
3. **Both players see the same result**
4. **Results are applied automatically**

### UI Components

```typescript
// Coin Flip Modal Component
function CoinFlipModal({ coinFlipState, playerId, isPlayer1, onApprove }) {
  const hasApproved = isPlayer1 
    ? coinFlipState.player1HasApproved 
    : coinFlipState.player2HasApproved;
  const opponentHasApproved = isPlayer1
    ? coinFlipState.player2HasApproved
    : coinFlipState.player1HasApproved;

  return (
    <Modal>
      <Title>Coin Flip Required</Title>
      <Message>
        {coinFlipState.configuration.fixedCount 
          ? `Flip ${coinFlipState.configuration.fixedCount} coin(s)`
          : 'Flip coins until tails appears'}
      </Message>
      
      {coinFlipState.results.length > 0 ? (
        // Show results
        <CoinFlipResults results={coinFlipState.results} />
      ) : (
        // Show approval button
        <>
          {hasApproved ? (
            <Status>Waiting for opponent to approve...</Status>
          ) : (
            <Button onClick={onApprove}>Approve Coin Flip</Button>
          )}
        </>
      )}
    </Modal>
  );
}
```

## Error Handling

### Already Approved

```typescript
try {
  await approveCoinFlip(matchId, playerId);
} catch (error) {
  if (error.message.includes('already approved')) {
    // Refresh state - player may have already approved
    const state = await getMatchState(matchId, playerId);
    updateCoinFlipUI(state.coinFlipState);
  } else {
    showError(error.message);
  }
}
```

### Invalid State

```typescript
if (!coinFlipState || coinFlipState.status !== 'READY_TO_FLIP') {
  // Coin flip not ready or already completed
  return;
}
```

## Polling for Updates

If opponent approves first, poll for updates:

```typescript
async function pollForCoinFlipResults(matchId: string, playerId: string) {
  const maxAttempts = 10;
  let attempts = 0;
  
  const poll = async () => {
    const state = await getMatchState(matchId, playerId);
    
    if (state.coinFlipState?.results.length > 0) {
      // Results generated, display them
      await displayCoinFlipsSequentially(
        state.coinFlipState.results,
        () => handleCoinFlipResult(state)
      );
      return;
    }
    
    if (state.coinFlipState === null && state.lastAction?.actionType === 'ATTACK') {
      // Coin flip completed, results in lastAction
      handleCoinFlipResult(state);
      return;
    }
    
    if (attempts < maxAttempts) {
      attempts++;
      setTimeout(poll, 1000); // Poll every second
    } else {
      console.error('Timeout waiting for coin flip results');
    }
  };
  
  poll();
}
```

## Summary

### Key Points

1. **Both players can see coin flip state** - No player restriction for ATTACK context
2. **First approval triggers generation** - Deterministic results, same for both players
3. **Results displayed sequentially** - Client controls presentation timing
4. **Single-stage approval** - Results applied automatically after generation
5. **Multiple flips supported** - Fixed count and "until tails" patterns

### Implementation Checklist

- [ ] Detect `coinFlipState.status === 'READY_TO_FLIP'`
- [ ] Show coin flip UI to both players
- [ ] Implement `GENERATE_COIN_FLIP` action call
- [ ] Handle approval tracking (`player1HasApproved`, `player2HasApproved`)
- [ ] Display results sequentially for multiple flips
- [ ] Handle results in `lastAction.actionData.coinFlipResults`
- [ ] Poll for updates if opponent approves first
- [ ] Handle error cases (already approved, invalid state)
- [ ] Update UI to show approval status

### Important Notes

- Coin flip happens **automatically** when the **first player** approves
- Results are **deterministic** - both players see the same outcome
- Results are **applied immediately** after generation (single-stage approval)
- For multiple flips, all results are generated at once and displayed sequentially
- Approval flags (`player1HasApproved`, `player2HasApproved`) track who has approved


