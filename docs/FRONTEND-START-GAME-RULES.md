# Frontend Guide: Start Game Rules and Reshuffle

Complete guide for implementing the start game rules reshuffle feature in the frontend.

---

## Overview

When a match starts, players must have an initial hand that satisfies tournament-defined start game rules (e.g., "at least 1 Basic Pokemon"). If a player's hand doesn't satisfy all rules, they must show their hand to the opponent, shuffle those cards back into the deck, and draw a new hand. This process repeats until all rules are satisfied.

During the `INITIAL_SETUP` state, the opponent's hand is revealed in the match state response so players can see what cards were shown during reshuffle.

---

## API Changes

### Match State Response

The `OpponentStateDto` now includes an optional `revealedHand` field that is populated during `INITIAL_SETUP` state:

```typescript
interface OpponentStateDto {
  handCount: number;
  deckCount: number;
  discardCount: number;
  activePokemon: PokemonInPlayDto | null;
  bench: PokemonInPlayDto[];
  benchCount: number;
  prizeCardsRemaining: number;
  attachedEnergy: string[];
  revealedHand?: string[]; // NEW: Opponent's hand revealed during INITIAL_SETUP
}
```

### When `revealedHand` is Populated

- **State**: `INITIAL_SETUP` only
- **Content**: Array of card IDs that were in the opponent's hand during reshuffle
- **Visibility**: Only present when match state is `INITIAL_SETUP`
- **After Setup**: Once match progresses to `PLAYER_TURN`, `revealedHand` is `undefined` and hand becomes private again

---

## TypeScript Interfaces

### Updated Match State Response

```typescript
interface MatchStateResponseDto {
  matchId: string;
  state: MatchState;
  currentPlayer: PlayerIdentifier | null;
  turnNumber: number;
  phase: TurnPhase | null;
  playerState: PlayerStateDto;
  opponentState: OpponentStateDto; // Updated with revealedHand
  availableActions: string[];
  lastAction?: ActionSummaryDto;
  playerDeckId: string | null;
  opponentDeckId: string | null;
}

interface OpponentStateDto {
  handCount: number;
  deckCount: number;
  discardCount: number;
  activePokemon: PokemonInPlayDto | null;
  bench: PokemonInPlayDto[];
  benchCount: number;
  prizeCardsRemaining: number;
  attachedEnergy: string[];
  revealedHand?: string[]; // NEW FIELD
}

enum MatchState {
  CREATED = 'CREATED',
  WAITING_FOR_PLAYERS = 'WAITING_FOR_PLAYERS',
  DECK_VALIDATION = 'DECK_VALIDATION',
  PRE_GAME_SETUP = 'PRE_GAME_SETUP',
  INITIAL_SETUP = 'INITIAL_SETUP', // Hand is revealed during this state
  PLAYER_TURN = 'PLAYER_TURN',
  BETWEEN_TURNS = 'BETWEEN_TURNS',
  MATCH_ENDED = 'MATCH_ENDED',
  CANCELLED = 'CANCELLED',
}
```

---

## Display Logic

### When to Show Revealed Hand

```typescript
function shouldShowRevealedHand(matchState: MatchState): boolean {
  return matchState === MatchState.INITIAL_SETUP;
}

function hasRevealedHand(opponentState: OpponentStateDto): boolean {
  return opponentState.revealedHand !== undefined && 
         opponentState.revealedHand.length > 0;
}
```

### Display Rules

1. **During INITIAL_SETUP**: Show opponent's `revealedHand` if present
2. **After INITIAL_SETUP**: Hide revealed hand, show only `handCount`
3. **Visual Distinction**: Use different styling to indicate these are revealed cards (not current hand)

---

## React Component Examples

### Basic Revealed Hand Display

```tsx
import React from 'react';
import { MatchState, OpponentStateDto } from '../types';

interface RevealedHandProps {
  opponentState: OpponentStateDto;
  matchState: MatchState;
  cardDetails: Map<string, CardDetail>; // From deck caching
}

export const RevealedHand: React.FC<RevealedHandProps> = ({
  opponentState,
  matchState,
  cardDetails,
}) => {
  // Only show during INITIAL_SETUP
  if (matchState !== MatchState.INITIAL_SETUP || !opponentState.revealedHand) {
    return null;
  }

  return (
    <div className="revealed-hand-container">
      <div className="revealed-hand-header">
        <h3>Opponent's Revealed Hand</h3>
        <span className="badge">Reshuffle Phase</span>
      </div>
      <div className="revealed-hand-cards">
        {opponentState.revealedHand.map((cardId) => {
          const card = cardDetails.get(cardId);
          return (
            <CardItem
              key={cardId}
              card={card || { cardId, name: 'Loading...' }}
              className="revealed-card"
            />
          );
        })}
      </div>
      <p className="revealed-hand-note">
        These cards were shown during the initial hand reshuffle.
      </p>
    </div>
  );
};
```

### Integrated Match View Component

```tsx
import React from 'react';
import { useMatchState } from '../hooks/useMatchState';
import { useMatchDecks } from '../hooks/useMatchDecks';
import { RevealedHand } from './RevealedHand';
import { OpponentHandCount } from './OpponentHandCount';

interface MatchViewProps {
  matchId: string;
  playerId: string;
}

export const MatchView: React.FC<MatchViewProps> = ({ matchId, playerId }) => {
  const { data: matchState, isLoading } = useMatchState(matchId, playerId);
  const { playerCards, opponentCards } = useMatchDecks(
    matchId,
    playerId,
    matchState,
  );

  if (isLoading || !matchState) {
    return <div>Loading match state...</div>;
  }

  const isInitialSetup = matchState.state === MatchState.INITIAL_SETUP;
  const hasRevealedHand =
    matchState.opponentState.revealedHand &&
    matchState.opponentState.revealedHand.length > 0;

  return (
    <div className="match-view">
      {/* Player's own hand */}
      <PlayerHand hand={matchState.playerState.hand} cards={playerCards} />

      {/* Opponent's hand area */}
      <div className="opponent-hand-area">
        {isInitialSetup && hasRevealedHand ? (
          <RevealedHand
            opponentState={matchState.opponentState}
            matchState={matchState.state}
            cardDetails={opponentCards}
          />
        ) : (
          <OpponentHandCount
            count={matchState.opponentState.handCount}
            isInitialSetup={isInitialSetup}
          />
        )}
      </div>

      {/* Rest of match UI */}
      <MatchBoard matchState={matchState} />
    </div>
  );
};
```

### Conditional Rendering Hook

```tsx
import { useMemo } from 'react';
import { MatchState, OpponentStateDto } from '../types';

export function useRevealedHand(
  opponentState: OpponentStateDto,
  matchState: MatchState,
) {
  return useMemo(() => {
    const shouldShow =
      matchState === MatchState.INITIAL_SETUP &&
      opponentState.revealedHand !== undefined &&
      opponentState.revealedHand.length > 0;

    return {
      shouldShow,
      revealedCards: shouldShow ? opponentState.revealedHand : [],
    };
  }, [opponentState, matchState]);
}

// Usage
const { shouldShow, revealedCards } = useRevealedHand(
  matchState.opponentState,
  matchState.state,
);
```

---

## UI/UX Recommendations

### Visual Design

1. **Distinct Styling**: Use different visual treatment for revealed cards
   - Slightly faded/transparent appearance
   - Border or background color to indicate "revealed" state
   - Optional: "Revealed" badge or label

2. **Layout**: Display revealed hand in a separate, clearly labeled section
   - Above or beside the opponent's hand count
   - Use a card grid similar to player's hand but with different styling

3. **State Indicators**: Show clear visual feedback
   - "Reshuffle Phase" badge during INITIAL_SETUP
   - Transition animation when state changes from INITIAL_SETUP to PLAYER_TURN

### User Experience

1. **Information Hierarchy**:
   - Revealed hand should be secondary to player's own hand
   - Don't overwhelm the UI - use collapsible section if needed

2. **State Transitions**:
   - Smoothly hide revealed hand when match progresses to PLAYER_TURN
   - Show a brief message explaining why hand is revealed

3. **Accessibility**:
   - Use ARIA labels: `aria-label="Opponent's revealed hand during reshuffle"`
   - Provide screen reader text explaining the revealed hand context

---

## Styling Examples

### CSS/Tailwind Classes

```css
/* Revealed hand container */
.revealed-hand-container {
  @apply bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-4;
  @apply opacity-75; /* Slightly faded to indicate revealed state */
}

.revealed-hand-header {
  @apply flex items-center justify-between mb-3;
}

.revealed-hand-header h3 {
  @apply text-lg font-semibold text-gray-700;
}

.revealed-hand-header .badge {
  @apply px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded;
}

.revealed-hand-cards {
  @apply grid grid-cols-4 gap-2;
}

.revealed-card {
  @apply opacity-90 transform scale-95;
  @apply border-2 border-gray-400;
}

.revealed-hand-note {
  @apply text-sm text-gray-600 italic mt-2;
}
```

### Transition Animation

```css
.revealed-hand-container {
  transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out;
}

.revealed-hand-container.hidden {
  opacity: 0;
  transform: translateY(-10px);
  pointer-events: none;
}
```

---

## Complete Example: Match State Hook

```tsx
import { useQuery } from '@tanstack/react-query';
import { MatchStateResponseDto } from '../types';

async function fetchMatchState(
  matchId: string,
  playerId: string,
): Promise<MatchStateResponseDto> {
  const response = await fetch(
    `/api/v1/matches/${matchId}/state?playerId=${playerId}`,
  );
  if (!response.ok) {
    throw new Error('Failed to fetch match state');
  }
  return response.json();
}

export function useMatchState(matchId: string, playerId: string) {
  return useQuery({
    queryKey: ['matchState', matchId, playerId],
    queryFn: () => fetchMatchState(matchId, playerId),
    refetchInterval: (data) => {
      // Poll more frequently during INITIAL_SETUP
      if (data?.state === MatchState.INITIAL_SETUP) {
        return 1000; // 1 second
      }
      return 2000; // 2 seconds
    },
  });
}
```

---

## Error Handling

### Missing Card Details

```tsx
function RevealedHandCard({ cardId, cardDetails }: RevealedHandCardProps) {
  const card = cardDetails.get(cardId);

  if (!card) {
    // Fallback UI for missing card
    return (
      <div className="card-placeholder">
        <span>Card: {cardId}</span>
        <span className="text-xs text-gray-500">Loading...</span>
      </div>
    );
  }

  return <CardItem card={card} className="revealed-card" />;
}
```

### State Mismatch

```tsx
// Validate that revealedHand is only present during INITIAL_SETUP
if (
  matchState.state !== MatchState.INITIAL_SETUP &&
  matchState.opponentState.revealedHand
) {
  console.warn(
    'revealedHand present outside INITIAL_SETUP state - this should not happen',
  );
  // Don't display revealed hand if state doesn't match
}
```

---

## Testing Considerations

### Unit Tests

```typescript
describe('RevealedHand Component', () => {
  it('should not render when state is not INITIAL_SETUP', () => {
    const opponentState = { revealedHand: ['card-1'], handCount: 7 };
    const { container } = render(
      <RevealedHand
        opponentState={opponentState}
        matchState={MatchState.PLAYER_TURN}
        cardDetails={new Map()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render revealed cards during INITIAL_SETUP', () => {
    const opponentState = { revealedHand: ['card-1', 'card-2'], handCount: 7 };
    const cardDetails = new Map([
      ['card-1', { cardId: 'card-1', name: 'Pikachu' }],
      ['card-2', { cardId: 'card-2', name: 'Charmander' }],
    ]);

    const { getByText } = render(
      <RevealedHand
        opponentState={opponentState}
        matchState={MatchState.INITIAL_SETUP}
        cardDetails={cardDetails}
      />,
    );

    expect(getByText('Pikachu')).toBeInTheDocument();
    expect(getByText('Charmander')).toBeInTheDocument();
  });
});
```

---

## Summary

### Key Points

1. **New Field**: `opponentState.revealedHand` is an optional array of card IDs
2. **State-Dependent**: Only populated during `INITIAL_SETUP` state
3. **Visual Distinction**: Use different styling to show these are revealed cards
4. **Temporary**: Hand becomes private again once match progresses to `PLAYER_TURN`
5. **Card Details**: Use deck caching to get full card details for display

### Implementation Checklist

- [ ] Update TypeScript interfaces to include `revealedHand`
- [ ] Create `RevealedHand` component
- [ ] Add conditional rendering logic based on match state
- [ ] Style revealed cards differently from normal hand
- [ ] Handle missing card details gracefully
- [ ] Add transition animations for state changes
- [ ] Test with different match states
- [ ] Ensure accessibility (ARIA labels, screen reader support)

---

**Last Updated:** 2025-01-XX

**Related Documentation:**
- [MATCH-API.md](./MATCH-API.md) - Match API endpoints
- [CLIENT-DECK-CACHING.md](./CLIENT-DECK-CACHING.md) - Deck caching guide
- [FRONTEND-COMPONENT-GUIDE.md](./FRONTEND-COMPONENT-GUIDE.md) - Component examples

