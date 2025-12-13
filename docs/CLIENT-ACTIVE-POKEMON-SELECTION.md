# Client Active Pokemon Selection Guide

## Overview

After a Pokemon is knocked out and the attacker selects a prize card, if the opponent (or both players in a double knockout scenario) has bench Pokemon available, the match enters a `SELECT_ACTIVE_POKEMON` phase. During this phase, players must select a new active Pokemon from their bench before the game can continue.

## ⚠️ IMPORTANT: When to Open the Modal

**The modal should ONLY open AFTER prize selection, NOT immediately after knockout!**

### Correct Flow:
1. **ATTACK** with `isKnockedOut: true` → Phase: `END` → Show prize selection UI
2. **SELECT_PRIZE** action → Check response phase
3. If `phase === 'SELECT_ACTIVE_POKEMON'` → **NOW open the modal**

### ❌ Wrong Flow:
- Opening modal immediately after ATTACK (phase is still `END`)
- Not checking phase after SELECT_PRIZE action

### ✅ Quick Check:
```typescript
// After SELECT_PRIZE action
if (response.phase === 'SELECT_ACTIVE_POKEMON') {
  // Open modal here
  openActivePokemonSelectionModal();
}
```

## Key Concepts

### When Active Pokemon Selection is Required

Active Pokemon selection is triggered when:
1. A Pokemon is knocked out (opponent's active Pokemon has 0 HP)
2. The attacker selects a prize card (`SELECT_PRIZE` action)
3. The opponent (or both players) has no active Pokemon but has bench Pokemon available

### Phase Flow

1. **Knockout Occurs**: Opponent's active Pokemon is knocked out
   - Phase: `END`
   - `lastAction.actionType === 'ATTACK'` and `lastAction.actionData.isKnockedOut === true`
   - `availableActions` includes `'SELECT_PRIZE'`
   - **IMPORTANT**: Modal should NOT open yet - prize must be selected first!

2. **Prize Selection**: Attacker selects a prize card (`SELECT_PRIZE` action)
   - **After this action, check the response phase!**
   - If opponent has bench Pokemon: Phase transitions to `SELECT_ACTIVE_POKEMON`
   - If opponent has no bench Pokemon: Phase stays `END` (match may end if win condition met)

3. **Phase Transition**: Match phase changes to `SELECT_ACTIVE_POKEMON` (only after prize selection)
   - `phase === 'SELECT_ACTIVE_POKEMON'`
   - `requiresActivePokemonSelection` and `playersRequiringActiveSelection` are set
   - **NOW the modal should open**

4. **Modal Display**: Client should open active Pokemon selection modal
   - Check `phase === 'SELECT_ACTIVE_POKEMON'`
   - Check `requiresActivePokemonSelection === true` (for current player)
   - Check `playersRequiringActiveSelection` array

5. **Pokemon Selection**: Player(s) select a Pokemon from bench (`SET_ACTIVE_POKEMON` action)

6. **Phase Completion**: Phase returns to `END` after all required players have selected

### Double Knockout Scenario

In a double knockout (both players' active Pokemon are knocked out simultaneously):
- Both players must select an active Pokemon
- The `playersRequiringActiveSelection` array will contain both `PLAYER1` and `PLAYER2`
- Both players can select simultaneously (no turn order required)
- Phase remains `SELECT_ACTIVE_POKEMON` until both players have selected

## API Response Structure

### MatchStateResponseDto Updates

The match state response includes new fields when active Pokemon selection is required:

```typescript
interface MatchStateResponseDto {
  // ... existing fields ...
  phase: 'SELECT_ACTIVE_POKEMON' | 'DRAW' | 'MAIN_PHASE' | 'ATTACK' | 'END';
  requiresActivePokemonSelection?: boolean;  // NEW: True if current player needs to select
  playersRequiringActiveSelection?: PlayerIdentifier[];  // NEW: Array of players who need to select
  availableActions: string[];  // Will include 'SET_ACTIVE_POKEMON' when applicable
  playerState: {
    activePokemon: PokemonInPlayDto | null;  // Will be null if selection is needed
    bench: PokemonInPlayDto[];  // Available Pokemon to select from
    // ... other fields ...
  };
  // ... other fields ...
}
```

### Field Descriptions

- **`phase: 'SELECT_ACTIVE_POKEMON'`**: Indicates the match is in active Pokemon selection phase
- **`requiresActivePokemonSelection: boolean`**: 
  - `true`: Current player needs to select an active Pokemon
  - `false`: Current player doesn't need to select (opponent needs to)
  - `undefined`: Not in selection phase
- **`playersRequiringActiveSelection: PlayerIdentifier[]`**: 
  - Array of player identifiers who still need to select
  - Example: `['PLAYER2']` means only Player 2 needs to select
  - Example: `['PLAYER1', 'PLAYER2']` means both players need to select (double knockout)
  - `undefined`: Not in selection phase or all players have selected

## Client Implementation

### 1. Detecting Active Pokemon Selection State

**CRITICAL**: The modal should only open AFTER prize selection, not immediately after knockout!

#### Step 1: After ATTACK with Knockout

```typescript
// After ATTACK action with isKnockedOut: true
const attackResponse = await fetchMatchState(matchId, playerId);

if (attackResponse.lastAction?.actionType === 'ATTACK' && 
    attackResponse.lastAction?.actionData?.isKnockedOut === true) {
  
  // Phase will be 'END'
  // availableActions will include 'SELECT_PRIZE'
  // DO NOT open modal yet - prize must be selected first!
  
  if (attackResponse.availableActions.includes('SELECT_PRIZE')) {
    // Show prize selection UI (not active Pokemon selection)
    showPrizeSelectionUI();
  }
}
```

#### Step 2: After SELECT_PRIZE Action

```typescript
// After SELECT_PRIZE action, check the response phase
const prizeResponse = await fetch('/api/v1/matches/123/actions', {
  method: 'POST',
  body: JSON.stringify({
    playerId: playerId,
    actionType: 'SELECT_PRIZE',
    actionData: { prizeIndex: 0 }
  })
});

const matchState = await prizeResponse.json();

// NOW check for SELECT_ACTIVE_POKEMON phase
if (matchState.phase === 'SELECT_ACTIVE_POKEMON') {
  // Active Pokemon selection is required
  const needsSelection = matchState.requiresActivePokemonSelection === true;
  const playersNeedingSelection = matchState.playersRequiringActiveSelection || [];
  
  if (needsSelection) {
    // Open modal for current player
    openActivePokemonSelectionModal();
  } else {
    // Show waiting state (opponent needs to select)
    showWaitingForOpponentSelection();
  }
} else {
  // Phase is 'END' - opponent has no bench Pokemon or match ended
  // No active Pokemon selection needed
}
```

#### Step 3: Always Check Phase After Actions

```typescript
// Helper function to check if modal should open
function checkForActivePokemonSelection(matchState: MatchStateResponseDto) {
  if (matchState.phase === 'SELECT_ACTIVE_POKEMON') {
    const needsSelection = matchState.requiresActivePokemonSelection === true;
    const playersNeedingSelection = matchState.playersRequiringActiveSelection || [];
    
    if (needsSelection) {
      openActivePokemonSelectionModal();
    } else if (playersNeedingSelection.length > 0) {
      showWaitingForOpponentSelection();
    }
  }
}

// Use after every action that might trigger selection phase
const response = await performAction(action);
checkForActivePokemonSelection(response);
```

### 2. Opening the Selection Modal

When `phase === 'SELECT_ACTIVE_POKEMON'` and `requiresActivePokemonSelection === true`:

```typescript
function openActivePokemonSelectionModal() {
  const benchPokemon = matchState.playerState.bench;
  
  // Display modal with bench Pokemon
  // Each Pokemon should show:
  // - Card image/name
  // - Current HP
  // - Attached energy
  // - Evolution chain (if any)
  // - Status effects (if any)
  
  showModal({
    title: 'Select Active Pokemon',
    message: 'Choose a Pokemon from your bench to become your active Pokemon',
    pokemon: benchPokemon,
    onSelect: handlePokemonSelection
  });
}
```

### 3. Making the Selection Request

When player selects a Pokemon from the bench:

```http
POST /api/v1/matches/{matchId}/actions
Content-Type: application/json

{
  "playerId": "player-123",
  "actionType": "SET_ACTIVE_POKEMON",
  "actionData": {
    "cardId": "pokemon-base-set-v1.0-ivysaur--30"
  }
}
```

**Request Fields:**
- `playerId`: Current player's ID
- `actionType`: Must be `"SET_ACTIVE_POKEMON"`
- `actionData.cardId`: The card ID of the Pokemon to select from bench

**Response:**
- Returns updated match state
- If selection was successful:
  - `phase` will be `'END'` (if single knockout) or remain `'SELECT_ACTIVE_POKEMON'` (if double knockout and other player still needs to select)
  - `playerState.activePokemon` will be the selected Pokemon
  - Selected Pokemon will be removed from `playerState.bench`
  - All attachments (energy, evolution chain) are preserved
  - Status effects are cleared (Pokemon moves to active with no status)

### 4. Handling Double Knockout

In double knockout scenarios, both players need to select:

```typescript
// After first player selects
if (matchState.phase === 'SELECT_ACTIVE_POKEMON') {
  const playersNeedingSelection = matchState.playersRequiringActiveSelection || [];
  
  if (playersNeedingSelection.includes('PLAYER1') && playersNeedingSelection.includes('PLAYER2')) {
    // Both players still need to select
    // Keep modal open for current player if they haven't selected
    // Show waiting indicator for opponent
  } else if (playersNeedingSelection.length === 0) {
    // All players have selected, phase should be 'END'
    closeModal();
  }
}
```

### 5. Polling for Opponent Selection

When waiting for opponent to select (in double knockout or when opponent needs to select):

```typescript
// Poll match state every 1-2 seconds
const pollInterval = setInterval(async () => {
  const updatedState = await fetchMatchState(matchId, playerId);
  
  if (updatedState.phase !== 'SELECT_ACTIVE_POKEMON') {
    // Selection phase complete
    clearInterval(pollInterval);
    updateUI(updatedState);
  } else {
    // Check if opponent has selected
    const playersNeedingSelection = updatedState.playersRequiringActiveSelection || [];
    const currentPlayerId = getCurrentPlayerIdentifier(); // 'PLAYER1' or 'PLAYER2'
    
    if (!playersNeedingSelection.includes(currentPlayerId)) {
      // Opponent has selected, update UI
      updateUI(updatedState);
    }
  }
}, 2000); // Poll every 2 seconds
```

## Complete Flow Example

### Single Knockout Scenario

```typescript
// 1. Knockout occurs (opponent's active Pokemon has 0 HP)
const attackResponse = await fetch('/api/v1/matches/123/actions', {
  method: 'POST',
  body: JSON.stringify({
    playerId: 'player-1',
    actionType: 'ATTACK',
    actionData: { attackIndex: 0 }
  })
});

const attackState = await attackResponse.json();
// attackState.phase === 'END'
// attackState.lastAction.actionType === 'ATTACK'
// attackState.lastAction.actionData.isKnockedOut === true
// attackState.availableActions.includes('SELECT_PRIZE') === true
// attackState.opponentState.activePokemon === null

// IMPORTANT: Do NOT open active Pokemon selection modal yet!
// The phase is still 'END', not 'SELECT_ACTIVE_POKEMON'
// Show prize selection UI instead

// 2. Attacker selects prize
const prizeResponse = await fetch('/api/v1/matches/123/actions', {
  method: 'POST',
  body: JSON.stringify({
    playerId: 'player-1',
    actionType: 'SELECT_PRIZE',
    actionData: { prizeIndex: 0 }
  })
});

// 3. Response shows SELECT_ACTIVE_POKEMON phase (if opponent has bench Pokemon)
const matchState = await prizeResponse.json();
// matchState.phase === 'SELECT_ACTIVE_POKEMON'  ← Check this!
// matchState.requiresActivePokemonSelection === false (attacker doesn't need to select)
// matchState.playersRequiringActiveSelection === ['PLAYER2']

// 4. Opponent (Player 2) polls match state and sees the phase
const opponentStateResponse = await fetch('/api/v1/matches/123/state', {
  method: 'POST',
  body: JSON.stringify({ playerId: 'player-2' })
});

const opponentState = await opponentStateResponse.json();
// opponentState.phase === 'SELECT_ACTIVE_POKEMON'
// opponentState.requiresActivePokemonSelection === true
// opponentState.playersRequiringActiveSelection === ['PLAYER2']

// NOW open the modal
if (opponentState.phase === 'SELECT_ACTIVE_POKEMON' && 
    opponentState.requiresActivePokemonSelection === true) {
  openActivePokemonSelectionModal(opponentState.playerState.bench);
}

// 5. Opponent selects Pokemon
const selectResponse = await fetch('/api/v1/matches/123/actions', {
  method: 'POST',
  body: JSON.stringify({
    playerId: 'player-2',
    actionType: 'SET_ACTIVE_POKEMON',
    actionData: { cardId: 'pokemon-base-set-v1.0-ivysaur--30' }
  })
});

// 6. Phase returns to END
const finalState = await selectResponse.json();
// finalState.phase === 'END'
// finalState.playerState.activePokemon !== null
```

### Double Knockout Scenario

```typescript
// 1. Both players' active Pokemon are knocked out
// Match state shows both players have activePokemon === null

// 2. Attacker selects prize
const prizeResponse = await fetch('/api/v1/matches/123/actions', {
  method: 'POST',
  body: JSON.stringify({
    playerId: 'player-1',
    actionType: 'SELECT_PRIZE',
    actionData: { prizeIndex: 0 }
  })
});

// 3. Response shows SELECT_ACTIVE_POKEMON phase with both players
const matchState = await prizeResponse.json();
// matchState.phase === 'SELECT_ACTIVE_POKEMON'
// matchState.requiresActivePokemonSelection === true (Player 1 needs to select)
// matchState.playersRequiringActiveSelection === ['PLAYER1', 'PLAYER2']

// 4. Both players see modal and can select simultaneously
// Player 1 selects
const player1Select = await fetch('/api/v1/matches/123/actions', {
  method: 'POST',
  body: JSON.stringify({
    playerId: 'player-1',
    actionType: 'SET_ACTIVE_POKEMON',
    actionData: { cardId: 'pokemon-base-set-v1.0-charmander--48' }
  })
});

// 5. Player 1's response still shows SELECT_ACTIVE_POKEMON phase
const player1State = await player1Select.json();
// player1State.phase === 'SELECT_ACTIVE_POKEMON'
// player1State.playersRequiringActiveSelection === ['PLAYER2'] (only Player 2 needs to select now)

// 6. Player 2 selects
const player2Select = await fetch('/api/v1/matches/123/actions', {
  method: 'POST',
  body: JSON.stringify({
    playerId: 'player-2',
    actionType: 'SET_ACTIVE_POKEMON',
    actionData: { cardId: 'pokemon-base-set-v1.0-ivysaur--30' }
  })
});

// 7. Phase returns to END after both players selected
const finalState = await player2Select.json();
// finalState.phase === 'END'
// finalState.playersRequiringActiveSelection === undefined
```

## UI/UX Recommendations

### Modal Design

1. **Title**: "Select Active Pokemon"
2. **Message**: 
   - Single knockout: "Choose a Pokemon from your bench to become your active Pokemon"
   - Double knockout: "Both players must select an active Pokemon. Choose yours now."
3. **Pokemon Display**: Show bench Pokemon as cards with:
   - Card image
   - Pokemon name
   - Current HP / Max HP
   - Attached energy (visual indicators)
   - Evolution chain (if evolved)
   - Status effects (if any - note: these will be cleared when moved to active)
4. **Selection**: Click/tap on a Pokemon card to select
5. **Cancel**: Disable cancel button (selection is required to continue)

### Waiting State

When opponent needs to select (in double knockout or when you're the attacker):

1. **Indicator**: Show "Waiting for opponent to select active Pokemon..."
2. **Visual**: Dimmed/disabled UI with loading spinner
3. **Polling**: Poll match state every 1-2 seconds to detect when opponent has selected

### Error Handling

```typescript
try {
  const response = await fetch('/api/v1/matches/123/actions', {
    method: 'POST',
    body: JSON.stringify({
      playerId: 'player-1',
      actionType: 'SET_ACTIVE_POKEMON',
      actionData: { cardId: 'pokemon-base-set-v1.0-ivysaur--30' }
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    
    // Common errors:
    // - 400: "Cannot set active Pokemon when one already exists"
    // - 400: "Card must be in hand or on bench"
    // - 400: "Invalid action: INVALID_PHASE" (not in SELECT_ACTIVE_POKEMON phase)
    
    showError(error.message);
  } else {
    const matchState = await response.json();
    updateUI(matchState);
  }
} catch (error) {
  showError('Failed to select active Pokemon. Please try again.');
}
```

## State Transitions

```
[Knockout Occurs]
    ↓
[ATTACK action with isKnockedOut: true]
    ↓
[Phase: END] ← Prize selection required, NO modal yet!
    ↓
[SELECT_PRIZE action] ← Attacker selects prize
    ↓
[Phase: SELECT_ACTIVE_POKEMON] ← Modal should open here (after prize selection!)
    ↓
[SET_ACTIVE_POKEMON action] ← Opponent selects active Pokemon
    ↓
[Phase: END] (or back to SELECT_ACTIVE_POKEMON if double knockout)
```

## Common Issues & Debugging

### Issue: Modal Not Opening After Knockout

**Problem**: Client expects modal to open immediately after ATTACK with `isKnockedOut: true`

**Solution**: The modal should only open AFTER `SELECT_PRIZE` action. Check the phase in the response:

```typescript
// ❌ WRONG - Checking phase immediately after ATTACK
const attackResponse = await performAttack();
if (attackResponse.phase === 'SELECT_ACTIVE_POKEMON') {
  openModal(); // This won't work - phase is still 'END'
}

// ✅ CORRECT - Check phase after SELECT_PRIZE
const prizeResponse = await selectPrize(prizeIndex);
if (prizeResponse.phase === 'SELECT_ACTIVE_POKEMON') {
  openModal(); // This will work
}
```

### Issue: Phase Stays END After Prize Selection

**Possible Causes**:
1. Opponent has no bench Pokemon (match may end)
2. Win condition was met (player collected last prize or opponent has no Pokemon)
3. Bug in phase transition logic

**Debug Steps**:
```typescript
const prizeResponse = await selectPrize(prizeIndex);
console.log('Phase after prize:', prizeResponse.phase);
console.log('Opponent bench:', prizeResponse.opponentState.bench);
console.log('Opponent active:', prizeResponse.opponentState.activePokemon);
console.log('Match state:', prizeResponse.state); // Check if MATCH_ENDED
console.log('Players requiring selection:', prizeResponse.playersRequiringActiveSelection);
```

### Issue: Modal Opens for Wrong Player

**Problem**: Modal opens for attacker instead of opponent

**Solution**: Always check `requiresActivePokemonSelection`:

```typescript
if (matchState.phase === 'SELECT_ACTIVE_POKEMON') {
  // Check if CURRENT player needs to select
  if (matchState.requiresActivePokemonSelection === true) {
    openModal(); // Current player needs to select
  } else {
    showWaiting(); // Opponent needs to select
  }
}
```

## Important Notes

1. **Attachments Preserved**: When a Pokemon is moved from bench to active, all attachments (energy cards, evolution chain) are preserved
2. **Status Effects Cleared**: Status effects (Confused, Paralyzed, etc.) are cleared when Pokemon moves to active position
3. **No Turn Order**: In double knockout scenarios, both players can select simultaneously - no need to wait for turn order
4. **Required Action**: Selection is mandatory - players cannot proceed until active Pokemon is selected
5. **Win Condition Check**: Win conditions are checked after prize selection, but only if no active Pokemon selection is needed (opponent has no bench Pokemon)
6. **END_TURN Prevention**: The attacker **cannot end their turn** while the opponent needs to select an active Pokemon. The server will return a 400 error: "Cannot end turn. Opponent must select an active Pokemon from their bench before you can end your turn."

## API Endpoints

### Get Match State

```http
POST /api/v1/matches/{matchId}/state
Content-Type: application/json

{
  "playerId": "player-123"
}
```

**Response includes:**
- `phase`: Current turn phase (may be `'SELECT_ACTIVE_POKEMON'`)
- `requiresActivePokemonSelection`: Boolean indicating if current player needs to select
- `playersRequiringActiveSelection`: Array of players who need to select
- `availableActions`: Will include `'SET_ACTIVE_POKEMON'` when applicable
- `playerState.bench`: Available Pokemon to select from
- `playerState.activePokemon`: Will be `null` if selection is needed

### Set Active Pokemon

```http
POST /api/v1/matches/{matchId}/actions
Content-Type: application/json

{
  "playerId": "player-123",
  "actionType": "SET_ACTIVE_POKEMON",
  "actionData": {
    "cardId": "pokemon-base-set-v1.0-ivysaur--30"
  }
}
```

**Success Response (200):**
- Updated match state with selected Pokemon as active
- Phase transitions to `'END'` (or remains `'SELECT_ACTIVE_POKEMON'` if double knockout)

**Error Responses:**
- `400 Bad Request`: Invalid action (wrong phase, card not in bench, etc.)
- `404 Not Found`: Match not found

## Testing Checklist

- [ ] **Modal does NOT open immediately after ATTACK with isKnockedOut**
- [ ] **Modal opens AFTER SELECT_PRIZE when phase === 'SELECT_ACTIVE_POKEMON'**
- [ ] Modal opens when `phase === 'SELECT_ACTIVE_POKEMON'` and `requiresActivePokemonSelection === true`
- [ ] Modal shows all bench Pokemon with correct information
- [ ] Selection request is sent with correct `cardId`
- [ ] Phase transitions to `'END'` after selection (single knockout)
- [ ] Phase remains `'SELECT_ACTIVE_POKEMON'` after first selection in double knockout
- [ ] Both players can select simultaneously in double knockout
- [ ] Waiting state is shown when opponent needs to select
- [ ] Polling detects when opponent has selected
- [ ] Attachments (energy, evolutions) are preserved in selected Pokemon
- [ ] Status effects are cleared in selected Pokemon
- [ ] Error handling works for invalid selections

## Quick Reference: Response After Actions

### After ATTACK with Knockout
```json
{
  "phase": "END",
  "lastAction": {
    "actionType": "ATTACK",
    "actionData": {
      "isKnockedOut": true
    }
  },
  "availableActions": ["SELECT_PRIZE", "CONCEDE"],
  "opponentState": {
    "activePokemon": null
  }
}
```
**Action**: Show prize selection UI, NOT active Pokemon selection modal

### After SELECT_PRIZE (Opponent has bench Pokemon)
```json
{
  "phase": "SELECT_ACTIVE_POKEMON",
  "requiresActivePokemonSelection": false,
  "playersRequiringActiveSelection": ["PLAYER2"],
  "availableActions": ["END_TURN", "CONCEDE"],
  "opponentState": {
    "activePokemon": null,
    "bench": [...]
  }
}
```
**Action**: Opponent should see modal (attacker sees waiting state)

### After SELECT_PRIZE (Opponent has NO bench Pokemon)
```json
{
  "phase": "END",
  "state": "MATCH_ENDED",
  "winnerId": "player-1"
}
```
**Action**: Match ended, no modal needed
