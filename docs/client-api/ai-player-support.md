# AI Player Support - Client API Documentation

## Overview

The OpenTCG Backend now supports creating matches against AI players. This allows players to practice or play games without waiting for another human player to join. The AI player automatically makes decisions during its turn.

## New API Endpoint

### Get Available AI Players

**Endpoint:** `GET /api/v1/matches/ai-players`

**Description:** Retrieves a list of all available AI players that can be used for matches.

**Response:** Array of AI player objects

**Response Schema:**
```typescript
interface AiPlayerResponseDto {
  id: string;              // Unique identifier (e.g., "AIPlayerV0.1")
  name: string;            // Display name (e.g., "AI Player V0.1")
  version: string;         // Version number (e.g., "0.1")
  description?: string;    // Optional description
}
```

**Example Request:**
```bash
GET /api/v1/matches/ai-players
```

**Example Response:**
```json
[
  {
    "id": "AIPlayerV0.1",
    "name": "AI Player V0.1",
    "version": "0.1",
    "description": "Basic AI player with strategic decision-making"
  }
]
```

**Status Codes:**
- `200 OK` - Successfully retrieved AI players list

---

## Updated API Endpoints

### Create Match (Updated)

**Endpoint:** `POST /api/v1/matches`

**Description:** Creates a new match. Now supports creating matches against AI players.

**Request Body Schema:**
```typescript
interface CreateMatchRequestDto {
  id?: string;              // Optional: Custom match ID (UUID)
  tournamentId: string;     // Required: Tournament ID
  player1Id?: string;       // Optional: Player 1 ID (required if vsAi is true)
  player1DeckId?: string;   // Optional: Player 1 deck ID (required if vsAi is true)
  vsAi?: boolean;          // Optional: If true, creates match against AI player
  aiPlayerId?: string;      // Optional: Specific AI player ID (defaults to "AIPlayerV0.1")
  aiDeckId?: string;       // Optional: AI player deck ID (required if vsAi is true)
}
```

**New Fields:**
- `vsAi` (boolean, optional): Set to `true` to create a match against an AI player
- `aiPlayerId` (string, optional): Specify which AI player to use. If not provided, defaults to `"AIPlayerV0.1"`
- `aiDeckId` (string, optional): Specify which deck the AI player should use. **Required when `vsAi` is `true`**

**Behavior:**
- When `vsAi` is `true`:
  - `player1Id`, `player1DeckId`, and `aiDeckId` are **required**
  - The AI player is automatically assigned as `player2` with the specified `aiDeckId`
  - The match is created with `player1Type: "HUMAN"` and `player2Type: "AI"`
  - The match can be started immediately (no need to wait for a second player)

**Example Request (vs AI):**
```json
{
  "tournamentId": "tournament-123",
  "player1Id": "human-player-456",
  "player1DeckId": "deck-789",
  "vsAi": true,
  "aiPlayerId": "AIPlayerV0.1",
  "aiDeckId": "classic-water-starter-deck"
}
```

**Example Request (vs Human - existing behavior):**
```json
{
  "tournamentId": "tournament-123",
  "player1Id": "human-player-456",
  "player1DeckId": "deck-789"
}
```

**Response:** Same as before (see Match Response below)

**Status Codes:**
- `201 Created` - Match created successfully
- `400 Bad Request` - Invalid request (e.g., missing required fields when vsAi is true)

---

### Get Match (Updated Response)

**Endpoint:** `GET /api/v1/matches/:matchId`

**Description:** Retrieves match information. Response now includes player type information.

**Response Schema:**
```typescript
interface MatchResponseDto {
  id: string;
  tournamentId: string;
  player1Id: string | null;
  player2Id: string | null;
  player1DeckId: string | null;
  player2DeckId: string | null;
  player1Type: PlayerType | null;      // NEW: "HUMAN" | "AI" | null
  player2Type: PlayerType | null;      // NEW: "HUMAN" | "AI" | null
  state: MatchState;
  currentPlayer: PlayerIdentifier | null;
  firstPlayer: PlayerIdentifier | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  endedAt: string | null;
  winnerId: string | null;
  result: MatchResult | null;
  winCondition: WinCondition | null;
  cancellationReason: string | null;
}
```

**New Fields:**
- `player1Type`: Indicates if player 1 is `"HUMAN"` or `"AI"` (or `null` if not set)
- `player2Type`: Indicates if player 2 is `"HUMAN"` or `"AI"` (or `null` if not set)

**PlayerType Values:**
- `"HUMAN"` - Human player
- `"AI"` - AI player
- `null` - Player type not set (for backward compatibility with existing matches)

**Example Response (vs AI):**
```json
{
  "id": "match-123",
  "tournamentId": "tournament-456",
  "player1Id": "human-player-789",
  "player2Id": "AIPlayerV0.1",
  "player1DeckId": "deck-abc",
  "player2DeckId": null,
  "player1Type": "HUMAN",
  "player2Type": "AI",
  "state": "WAITING_FOR_PLAYERS",
  "currentPlayer": null,
  "firstPlayer": null,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z",
  "startedAt": null,
  "endedAt": null,
  "winnerId": null,
  "result": null,
  "winCondition": null,
  "cancellationReason": null
}
```

---

## Game Flow Considerations

### AI Player Turn Handling

When playing against an AI player:

1. **Automatic Actions**: The AI player automatically executes actions during its turn. You don't need to wait for the AI to submit actions via the API.

2. **Turn Flow**:
   - When it's the AI's turn, the backend automatically processes AI actions
   - The AI will make decisions based on the current game state
   - After the AI's turn completes, the match state will reflect the AI's actions
   - The turn will automatically advance to the human player

3. **Polling for Updates**: 
   - Use `GET /api/v1/matches/:matchId` or `POST /api/v1/matches/:matchId/state` to check for match state updates
   - The match state will update automatically as the AI makes its moves
   - You may want to poll more frequently when it's the AI's turn

4. **Action Execution**:
   - Human players still use `POST /api/v1/matches/:matchId/actions` to execute their actions
   - The AI player's actions are handled automatically by the backend

### Match States

AI vs Human matches follow the same state flow as Human vs Human matches:
- `WAITING_FOR_PLAYERS` → `MATCH_APPROVAL` → `DRAWING_CARDS` → `SET_PRIZE_CARDS` → `FIRST_PLAYER_SELECTION` → `PLAYER_TURN` → etc.

The difference is that AI matches can start immediately without waiting for a second human player.

---

## Client Implementation Examples

### Example 1: Get Available AI Players

```typescript
async function getAvailableAiPlayers(): Promise<AiPlayerResponseDto[]> {
  const response = await fetch('/api/v1/matches/ai-players');
  if (!response.ok) {
    throw new Error('Failed to fetch AI players');
  }
  return response.json();
}
```

### Example 2: Create Match Against AI

```typescript
async function createMatchVsAi(
  tournamentId: string,
  playerId: string,
  playerDeckId: string,
  aiDeckId: string,
  aiPlayerId: string = 'AIPlayerV0.1'
): Promise<MatchResponseDto> {
  const response = await fetch('/api/v1/matches', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tournamentId,
      player1Id: playerId,
      player1DeckId: playerDeckId,
      vsAi: true,
      aiPlayerId,
      aiDeckId,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to create match');
  }

  return response.json();
}
```

### Example 3: Check if Match Has AI Player

```typescript
function hasAiPlayer(match: MatchResponseDto): boolean {
  return match.player1Type === 'AI' || match.player2Type === 'AI';
}

function isMyTurn(match: MatchResponseDto, myPlayerId: string): boolean {
  // Check if it's the human player's turn
  if (match.currentPlayer === 'PLAYER1' && match.player1Id === myPlayerId) {
    return match.player1Type === 'HUMAN';
  }
  if (match.currentPlayer === 'PLAYER2' && match.player2Id === myPlayerId) {
    return match.player2Type === 'HUMAN';
  }
  return false;
}
```

### Example 4: Poll for AI Turn Completion

```typescript
async function waitForAiTurn(matchId: string): Promise<MatchResponseDto> {
  return new Promise((resolve, reject) => {
    const pollInterval = setInterval(async () => {
      try {
        const match = await getMatch(matchId);
        
        // Check if it's still the AI's turn
        const isAiTurn = 
          (match.currentPlayer === 'PLAYER1' && match.player1Type === 'AI') ||
          (match.currentPlayer === 'PLAYER2' && match.player2Type === 'AI');
        
        if (!isAiTurn) {
          clearInterval(pollInterval);
          resolve(match);
        }
      } catch (error) {
        clearInterval(pollInterval);
        reject(error);
      }
    }, 1000); // Poll every second

    // Timeout after 30 seconds
    setTimeout(() => {
      clearInterval(pollInterval);
      reject(new Error('Timeout waiting for AI turn'));
    }, 30000);
  });
}
```

---

## UI/UX Recommendations

### Match Creation Flow

1. **Show AI Player Options**:
   - Fetch available AI players using `GET /api/v1/matches/ai-players`
   - Display them in a selection UI (e.g., dropdown or cards)
   - Show AI player name, version, and description

2. **Match Type Selection**:
   - Provide options: "Play vs Human" or "Play vs AI"
   - If "Play vs AI" is selected:
     - Show AI player selection
     - Require player deck selection
     - Require AI deck selection (`aiDeckId`)
     - Create match immediately with `vsAi: true`

3. **Match Status Display**:
   - Show player type indicators (e.g., "Human" vs "AI" badges)
   - Display current turn with indication if it's AI's turn
   - Show appropriate messaging: "Waiting for AI..." or "Your turn"

### Turn Indicators

- **Human Turn**: Show action buttons and allow player interaction
- **AI Turn**: 
  - Show "AI is thinking..." or similar message
  - Disable action buttons
  - Optionally show a loading spinner
  - Poll for match state updates

---

## Error Handling

### Common Errors

1. **Missing Required Fields**:
   ```json
   {
     "statusCode": 400,
     "message": "player1Id and player1DeckId are required when creating a match vs AI"
   }
   ```
   
   Or:
   ```json
   {
     "statusCode": 400,
     "message": "aiDeckId is required when creating a match vs AI"
   }
   ```

2. **Invalid AI Player ID**:
   ```json
   {
     "statusCode": 400,
     "message": "Invalid AI player ID: InvalidAIId"
   }
   ```

3. **AI Player Not Found**:
   - If an invalid `aiPlayerId` is provided, the API will return a 400 error
   - Always validate against the list from `GET /api/v1/matches/ai-players`

---

## Backward Compatibility

- Existing matches created before AI support will have `player1Type` and `player2Type` as `null`
- The `vsAi` field is optional - omitting it maintains the original behavior (human vs human)
- All existing API endpoints continue to work as before
- Client code should handle `null` player types gracefully

---

## TypeScript Type Definitions

```typescript
// Player Type Enum
type PlayerType = 'HUMAN' | 'AI';

// AI Player Response
interface AiPlayerResponseDto {
  id: string;
  name: string;
  version: string;
  description?: string;
}

// Create Match Request (updated)
interface CreateMatchRequestDto {
  id?: string;
  tournamentId: string;
  player1Id?: string;
  player1DeckId?: string;
  vsAi?: boolean;
  aiPlayerId?: string;
  aiDeckId?: string;  // Required when vsAi is true
}

// Match Response (updated)
interface MatchResponseDto {
  // ... existing fields ...
  player1Type: PlayerType | null;
  player2Type: PlayerType | null;
  // ... rest of fields ...
}
```

---

## Summary of Changes

### New Endpoints
- `GET /api/v1/matches/ai-players` - Get list of available AI players

### Updated Endpoints
- `POST /api/v1/matches` - Added `vsAi` and `aiPlayerId` fields
- `GET /api/v1/matches/:matchId` - Response now includes `player1Type` and `player2Type`
- `POST /api/v1/matches/:matchId/state` - Response includes player type information

### New Response Fields
- `MatchResponseDto.player1Type`: `"HUMAN" | "AI" | null`
- `MatchResponseDto.player2Type`: `"HUMAN" | "AI" | null`

### New Request Fields
- `CreateMatchRequestDto.vsAi`: `boolean` (optional)
- `CreateMatchRequestDto.aiPlayerId`: `string` (optional)
- `CreateMatchRequestDto.aiDeckId`: `string` (optional, required when `vsAi` is `true`)

---

## Questions or Issues?

For questions or issues related to AI player support, please refer to the main API documentation or contact the development team.


