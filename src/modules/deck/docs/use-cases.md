# Deck Use Cases

## Overview

This document describes the application use cases for deck management in the OpenTCG system.

## CRUD Operations

### 1. Create Deck

**Use Case:** `CreateDeckUseCase`

**Input:** `CreateDeckDto`
- name: string (required)
- createdBy: string (required)
- tournamentId: string (optional)
- cards: DeckCardDto[] (optional)

**Process:**
1. Generate unique UUID for deck ID
2. Convert DTO cards to domain DeckCard value objects
3. Create Deck entity with provided information
4. Save deck to repository
5. Return created deck

**Output:** Deck entity

**Validation:**
- DTO validation via class-validator
- Entity validation (ID, name, creator not empty)
- Card validation (cardId, setName, quantity)

**Side Effects:**
- Creates new JSON file in data/decks/

**Error Cases:**
- Invalid DTO (400 Bad Request)
- File system error (500 Internal Server Error)

---

### 2. Get Deck By ID

**Use Case:** `GetDeckByIdUseCase`

**Input:** deck ID (string)

**Process:**
1. Query repository for deck by ID
2. If not found, throw NotFoundException
3. Return deck entity

**Output:** Deck entity

**Error Cases:**
- Deck not found (404 Not Found)
- Invalid JSON file (500 Internal Server Error)

---

### 3. List Decks

**Use Case:** `ListDecksUseCase`

**Input:** tournamentId (string, optional)

**Process:**
1. Query repository for all decks
2. If tournamentId provided, filter decks by tournament
3. Return array of deck entities

**Output:** Deck[] array

**Filtering:**
- No filter: Returns all decks
- With tournamentId: Returns only decks for that tournament

**Error Cases:**
- File system error (500 Internal Server Error)

---

### 4. Update Deck

**Use Case:** `UpdateDeckUseCase`

**Input:**
- deck ID (string)
- `UpdateDeckDto`:
  - name: string (optional)
  - tournamentId: string (optional)
  - cards: DeckCardDto[] (optional)

**Process:**
1. Find existing deck by ID
2. If not found, throw NotFoundException
3. Update name if provided
4. Update tournamentId if provided
5. If cards provided:
   - Clear existing cards
   - Add all new cards
6. Save updated deck
7. Return updated deck

**Output:** Updated Deck entity

**Notes:**
- Partial updates supported (only specified fields updated)
- Cards replacement is all-or-nothing (not incremental)
- updatedAt timestamp automatically updated

**Error Cases:**
- Deck not found (404 Not Found)
- Invalid DTO (400 Bad Request)
- File system error (500 Internal Server Error)

---

### 5. Delete Deck

**Use Case:** `DeleteDeckUseCase`

**Input:** deck ID (string)

**Process:**
1. Check if deck exists
2. If not found, throw NotFoundException
3. Delete deck from repository
4. Return void

**Output:** void

**Side Effects:**
- Removes JSON file from data/decks/

**Error Cases:**
- Deck not found (404 Not Found)
- File system error (500 Internal Server Error)

---

## Validation Operations

### 6. Validate Deck Against Tournament

**Use Case:** `ValidateDeckAgainstTournamentUseCase`

**Input:**
- deck ID (string)
- tournament ID (string)

**Process:**

1. **Load Entities**
   - Load deck from repository
   - Load tournament from repository
   - Throw NotFoundException if either not found

2. **Extract Rules**
   - Get DeckRules from tournament
   - Get bannedSets from tournament
   - Get setBannedCards from tournament

3. **Validate Deck Size**
   - If exactDeckSize: must equal minDeckSize
   - Otherwise: must be between minDeckSize and maxDeckSize
   - Add error if violated

4. **Validate Banned Sets**
   - Check each unique set in deck
   - Add error if any set is in bannedSets
   - Also check individual cards from banned sets

5. **Validate Banned Cards**
   - For each card in deck:
     - Check if card is in setBannedCards[setName]
     - Add error if card is banned

6. **Validate Card Copies**
   - For each card in deck:
     - Get max allowed copies (default or restricted)
     - Compare with card quantity
     - Add error if quantity exceeds limit
     - Add warning if card is restricted

7. **Validate Basic Pokémon** (Limited)
   - If minBasicPokemon > 0:
     - Add warning about inability to verify without card data
   - Future: Load card data and count basic Pokémon

8. **Update Deck Status**
   - Set deck.isValid based on validation result
   - Save deck to persist status

9. **Return Result**
   - Create ValidationResult with errors/warnings
   - Return detailed result

**Output:** `ValidationResult`
- isValid: boolean
- errors: string[]
- warnings: string[]

**Validation Logic:**

| Check | Type | Condition | Message |
|-------|------|-----------|---------|
| Deck size (exact) | Error | count ≠ exact | "Deck must have exactly X cards but has Y" |
| Deck size (min) | Error | count < min | "Deck must have at least X cards but has Y" |
| Deck size (max) | Error | count > max | "Deck cannot have more than X cards but has Y" |
| Banned set | Error | set in bannedSets | "Set 'X' is banned in this tournament" |
| Banned card | Error | card in setBannedCards | "Card X is banned in this tournament" |
| Copy limit | Error | quantity > maxCopies | "Card X has Y copies but maximum is Z" |
| Restricted card | Warning | card is restricted | "Card X is restricted to Y copies" |
| Basic Pokémon | Warning | cannot verify | "Cannot verify minimum basic Pokémon requirement" |

**Error Cases:**
- Deck not found (404 Not Found)
- Tournament not found (404 Not Found)
- File system error (500 Internal Server Error)

---

## API Endpoint Mapping

| Endpoint | Method | Use Case | Response |
|----------|--------|----------|----------|
| /api/v1/decks | POST | CreateDeckUseCase | DeckResponseDto (201) |
| /api/v1/decks | GET | ListDecksUseCase | DeckListResponseDto (200) |
| /api/v1/decks/:id | GET | GetDeckByIdUseCase | DeckResponseDto (200) |
| /api/v1/decks/:id | PUT | UpdateDeckUseCase | DeckResponseDto (200) |
| /api/v1/decks/:id | DELETE | DeleteDeckUseCase | void (204) |
| /api/v1/decks/:id/validate | POST | ValidateDeckAgainstTournamentUseCase | ValidationResponseDto (200) |

---

## Example Workflows

### Workflow 1: Create and Validate Deck

1. Player creates a new deck (CreateDeckUseCase)
   - Provides name, createdBy, tournamentId
   - Optionally includes initial cards
   - Receives deck with isValid = false

2. Player adds cards to deck (UpdateDeckUseCase)
   - Updates deck with full card list
   - Cards are validated for basic structure
   - isValid remains false (not automatically validated)

3. Player validates deck (ValidateDeckAgainstTournamentUseCase)
   - Provides tournament ID
   - System checks all tournament rules
   - Receives detailed validation result
   - Deck's isValid flag is updated

4. If invalid:
   - Player reviews errors
   - Updates deck to fix issues (UpdateDeckUseCase)
   - Re-validates (ValidateDeckAgainstTournamentUseCase)
   - Repeats until valid

### Workflow 2: Browse and Clone Deck

1. Player lists all decks (ListDecksUseCase)
   - Optionally filters by tournament
   - Sees all available decks

2. Player views specific deck (GetDeckByIdUseCase)
   - Sees full card list
   - Checks validation status

3. Player creates new deck based on existing one
   - Calls CreateDeckUseCase with copied card list
   - Modifies as needed
   - Validates for their tournament

### Workflow 3: Tournament Organizer Review

1. Organizer lists decks for tournament (ListDecksUseCase)
   - Filters by specific tournament ID
   - Sees all submitted decks

2. For each deck:
   - Views details (GetDeckByIdUseCase)
   - Checks isValid flag
   - If needed, re-validates (ValidateDeckAgainstTournamentUseCase)

3. Organizer can reject invalid decks
   - Player must update and re-validate
   - Or organizer can delete (DeleteDeckUseCase)

---

## Dependencies

### Internal Module Dependencies

1. **Tournament Module**
   - Required for validation use case
   - Provides ITournamentRepository
   - Provides Tournament entity with rules

2. **Card Module** (Future)
   - Would enable full validation
   - Check card types (Basic Pokémon)
   - Verify card existence

### External Dependencies

1. **File System**
   - Read/write JSON files
   - Create directories
   - Handle file errors

2. **NestJS Framework**
   - Dependency injection
   - HTTP handling
   - Validation pipes

3. **Validation Libraries**
   - class-validator for DTOs
   - class-transformer for mapping

