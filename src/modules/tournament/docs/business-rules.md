# Tournament Business Rules

## Set Management Rules

### Rule: Default Allow All Sets

**Description**: When no sets are explicitly banned, all sets are allowed by default.

**Implementation**:
```typescript
isSetAllowed(setName: string): boolean {
  if (this.bannedSets.length === 0) {
    return true; // All sets allowed by default
  }
  return !this.bannedSets.includes(setName);
}
```

**Rationale**: This provides the most flexible default behavior, making it easier to create tournaments without restrictions.

### Rule: Explicit Set Banning

**Description**: Sets can be explicitly banned by adding them to the `bannedSets` array.

**Business Logic**:
- Banning a set automatically bans all cards within that set
- Unbanning a set makes all its cards available (unless individually banned)
- Duplicate bans are prevented automatically

## Card Banning Rules

### Rule: Set-Level Card Banning

**Description**: Individual cards within a set can be banned using the `setBannedCards` mapping.

**Implementation**:
```typescript
// Structure: { "set-name": ["card-id-1", "card-id-2"] }
setBannedCards: {
  "base-set": ["alakazam-base-1", "charizard-base-4"],
  "fossil": ["moltres-fossil-12"]
}
```

**Business Logic**:
- Cards must be referenced by both set name AND card ID
- Banned cards have max copies of 0
- Banning takes precedence over restriction

### Rule: Card Allowance Hierarchy

**Priority Order** (highest to lowest):
1. Set ban (if set is banned, all cards in it are banned)
2. Individual card ban (specific card is banned in setBannedCards)
3. Card restriction (card has limited copies in restrictedCards)
4. Default rule (use maxCopiesPerCard from deck rules)

## Deck Construction Rules

### Rule: Standard Deck Size

**Description**: Pokémon TCG standard requires exactly 60 cards.

**Configuration**:
```json
{
  "minDeckSize": 60,
  "maxDeckSize": 60,
  "exactDeckSize": true
}
```

**Validation**:
- If `exactDeckSize` is true, deck must have exactly `minDeckSize` cards
- If false, deck can have between `minDeckSize` and `maxDeckSize` cards

### Rule: Maximum Copies Per Card

**Description**: By default, maximum 4 copies of any card (except basic energy).

**Configuration**:
```json
{
  "maxCopiesPerCard": 4
}
```

**Exceptions**:
- Basic energy cards are unlimited (handled by card type, not tournament rules)
- Individual cards can be restricted to fewer copies

### Rule: Minimum Basic Pokémon

**Description**: Deck must contain at least 1 basic Pokémon to be valid.

**Configuration**:
```json
{
  "minBasicPokemon": 1
}
```

**Rationale**: Without basic Pokémon, a player cannot start the game.

### Rule: Card Restrictions

**Description**: Specific cards can have copy limits different from the default.

**Example**:
```json
{
  "restrictedCards": [
    {
      "setName": "base-set",
      "cardId": "alakazam-base-1",
      "maxCopies": 1
    }
  ]
}
```

**Use Cases**:
- Limit powerful cards to 1-2 copies
- Create balanced formats
- Tournament-specific restrictions

## Tournament Lifecycle Rules

### Rule: Tournament Status Transitions

**Valid Transitions**:
```
DRAFT → ACTIVE → COMPLETED
DRAFT → CANCELLED
ACTIVE → CANCELLED
```

**Business Logic**:
- New tournaments start in DRAFT status
- ACTIVE tournaments can accept matches and participants
- COMPLETED tournaments are read-only (historical record)
- CANCELLED tournaments are archived

### Rule: Tournament Dates

**Validation**:
- `startDate` (if set) must be before or equal to `endDate`
- `endDate` (if set) must be after or equal to `startDate`
- Dates are optional

**Use Cases**:
- Scheduled tournaments with fixed time windows
- Open-ended tournaments (no end date)
- Historical tournaments (both dates in the past)

### Rule: Participant Limits

**Validation**:
- `maxParticipants` (if set) must be ≥ 2
- No upper limit enforced by domain (practical limits in application layer)

**Rationale**: A tournament needs at least 2 participants to be meaningful.

## Format Rules

### Rule: Format-Specific Configurations

**Description**: Formats define common tournament configurations.

**Standard Format**:
- All recent sets allowed (no banned sets)
- Standard deck rules (60 cards, max 4 copies)
- May include regulation marks

**Classic Format**:
- Only classic sets (Base Set, Jungle, Fossil)
- Standard deck rules
- No regulation marks

**Custom Format**:
- User-defined set allowances
- Custom deck rules
- Optional restrictions

## Regulation Marks

### Rule: Regulation Mark Filtering

**Description**: Tournaments can specify which regulation marks are allowed.

**Implementation**:
```json
{
  "regulationMarks": ["D", "E", "F"]
}
```

**Business Logic**:
- Empty array = all regulation marks allowed
- Non-empty array = only specified marks allowed
- Cards without regulation marks are always allowed

## Future Rules (Not Yet Implemented)

### Deck Validation

When decks are implemented, validate:
1. Deck size matches tournament rules
2. No banned cards are included
3. Restricted cards don't exceed limits
4. Minimum basic Pokémon requirement met
5. All cards are from allowed sets
6. All cards match regulation marks (if specified)

### Match Rules

When matches are implemented:
1. Both players must have valid decks for the tournament
2. Decks must be registered before match starts
3. Match results affect tournament standings
4. Match format (best of 1, best of 3, etc.)

