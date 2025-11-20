# Tournament Use Cases

## Use Case 1: Create Tournament

**Actor**: System Administrator, Tournament Organizer

**Preconditions**:
- User has permission to create tournaments
- Tournament ID does not already exist

**Main Flow**:
1. User provides tournament details (name, description, rules)
2. System validates input data
3. System checks if tournament ID is unique
4. System creates tournament entity with provided configuration
5. System saves tournament to repository
6. System returns created tournament

**Validation Rules**:
- All required fields must be present (id, name, version, description, author)
- Deck rules must be valid (sizes, copies, etc.)
- Dates must be valid (start before end)
- Tournament ID must be unique

**Error Cases**:
- Tournament ID already exists → ConflictException
- Invalid deck rules → ValidationException
- Invalid dates → ValidationException

**Example Request**:
```json
{
  "id": "summer-classic-2024",
  "name": "Summer Classic 2024",
  "version": "1.0",
  "description": "A classic format tournament",
  "author": "tournament-organizer",
  "official": true,
  "status": "DRAFT",
  "format": "Classic",
  "deckRules": {
    "minDeckSize": 60,
    "maxDeckSize": 60,
    "exactDeckSize": true,
    "maxCopiesPerCard": 4,
    "minBasicPokemon": 1
  }
}
```

## Use Case 2: Get Tournament By ID

**Actor**: Any User

**Preconditions**:
- Tournament exists

**Main Flow**:
1. User requests tournament by ID
2. System retrieves tournament from repository
3. System returns tournament details

**Error Cases**:
- Tournament not found → NotFoundException

**Example Response**:
```json
{
  "id": "default-tournament",
  "name": "Default Tournament",
  "version": "1.0",
  "status": "ACTIVE",
  "official": true,
  "bannedSets": [],
  "setBannedCards": {},
  "deckRules": {
    "minDeckSize": 60,
    "maxDeckSize": 60,
    "exactDeckSize": true,
    "maxCopiesPerCard": 4,
    "minBasicPokemon": 1,
    "restrictedCards": []
  },
  "format": "Standard"
}
```

## Use Case 3: List All Tournaments

**Actor**: Any User

**Preconditions**: None

**Main Flow**:
1. User requests list of all tournaments
2. System retrieves all tournaments from repository
3. System returns tournament list with count

**Example Response**:
```json
{
  "tournaments": [
    { "id": "default-tournament", "name": "Default Tournament", ... },
    { "id": "classic-tournament", "name": "Classic Tournament", ... }
  ],
  "total": 2
}
```

## Use Case 4: Update Tournament

**Actor**: System Administrator, Tournament Organizer

**Preconditions**:
- User has permission to update tournaments
- Tournament exists

**Main Flow**:
1. User provides tournament ID and updated fields
2. System validates input data
3. System retrieves existing tournament
4. System applies updates to tournament entity
5. System saves updated tournament
6. System returns updated tournament

**Updatable Fields**:
- name, version, description, author
- official, status
- bannedSets, setBannedCards
- deckRules
- savedDecks
- startDate, endDate, maxParticipants
- format, regulationMarks

**Business Logic**:
- Arrays are replaced (not merged)
- To remove a field, pass empty array/object
- updatedAt timestamp is automatically updated

**Error Cases**:
- Tournament not found → NotFoundException
- Invalid updates → ValidationException

**Example Request**:
```json
{
  "status": "ACTIVE",
  "bannedSets": ["unwanted-set"],
  "setBannedCards": {
    "base-set": ["overpowered-card-1"]
  }
}
```

## Use Case 5: Delete Tournament

**Actor**: System Administrator

**Preconditions**:
- User has permission to delete tournaments
- Tournament exists
- Tournament has no active matches (future check)

**Main Flow**:
1. User requests tournament deletion by ID
2. System verifies tournament exists
3. System checks if tournament can be deleted
4. System deletes tournament from repository

**Error Cases**:
- Tournament not found → NotFoundException
- Tournament has active matches → ConflictException (future)

## Use Case 6: Load Default Tournament (Future Enhancement)

**Actor**: System (Initialization)

**Preconditions**: 
- System startup
- Default tournament file exists

**Main Flow**:
1. System reads default tournament JSON file
2. System checks if default tournament exists in repository
3. If not exists, system creates tournament from file
4. System makes tournament available for use

**Purpose**: Provide a ready-to-use tournament configuration

## Use Case 7: Validate Deck Against Tournament Rules (Future)

**Actor**: Player, System

**Preconditions**:
- Tournament exists
- Deck exists

**Main Flow**:
1. User submits deck for validation against tournament
2. System retrieves tournament rules
3. System validates:
   - Deck size matches rules
   - No banned cards
   - Restricted cards within limits
   - Minimum basic Pokémon requirement
   - All cards from allowed sets
4. System returns validation result with errors (if any)

**Validation Checks**:
```typescript
interface DeckValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
```

**Example Errors**:
- "Deck has 62 cards, must have exactly 60"
- "Card 'Alakazam' from base-set is banned in this tournament"
- "Card 'Charizard' exceeds maximum copies (5/1)"
- "Deck must contain at least 1 basic Pokémon"

## Use Case 8: Create Match from Tournament (Future)

**Actor**: Tournament Organizer

**Preconditions**:
- Tournament exists and is ACTIVE
- Two players with valid decks

**Main Flow**:
1. User creates match with tournament ID and player info
2. System validates both decks against tournament rules
3. System creates match entity with tournament rules applied
4. System links match to tournament
5. System returns created match

## Use Case 9: Clone Tournament Configuration

**Actor**: Tournament Organizer

**Preconditions**:
- Source tournament exists

**Main Flow**:
1. User requests to clone tournament with new ID
2. System retrieves source tournament
3. System creates new tournament with same configuration
4. System updates metadata (new ID, created date, DRAFT status)
5. System saves new tournament
6. System returns cloned tournament

**Use Cases**:
- Creating similar tournaments
- Creating tournament templates
- Versioning tournament configurations

## Common Patterns

### Error Handling Pattern

All use cases follow consistent error handling:
- **NotFoundException**: Resource not found (404)
- **ConflictException**: Resource already exists or conflict (409)
- **ValidationException**: Invalid input data (400)

### Authorization Pattern (Future)

Use cases will check permissions:
- Public: List, Get (read-only)
- Organizer: Create, Update (own tournaments)
- Admin: Delete, Update (any tournament)

### Audit Trail Pattern (Future)

Track changes to tournaments:
- Who created/modified the tournament
- When changes were made
- What changed (event sourcing)

