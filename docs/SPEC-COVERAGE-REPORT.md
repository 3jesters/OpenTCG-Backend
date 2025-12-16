# Spec Coverage Report

## Overview

This document tracks test coverage of business logic across the OpenTCG Backend codebase. It maps which business logic components are covered by unit tests and E2E tests, and identifies gaps in coverage.

**Last Updated**: 2025-01-27

## Maintenance Guidelines

This report should be updated whenever:
- A new spec/test is added
- Business logic is added or removed
- A use case is implemented or modified
- A domain entity or service is changed

**Update Process**:
1. When adding new business logic, add it to the "Business Logic Inventory" section
2. When adding new specs, update the "Spec Inventory" section
3. Update the "Coverage Matrix" to reflect new coverage
4. Update the "Coverage Gaps" section to identify missing tests
5. Update the "Last Updated" date at the top

---

## Business Logic Inventory

### Match Module

#### Domain Entities
- **Match Entity** (`src/modules/match/domain/entities/match.entity.ts`)
  - Constructor validation
  - `assignPlayer()` - Assign player to match, state transitions
  - `markDeckValidationComplete()` - Handle deck validation result
  - `approveMatch()` - Player approval, auto coin toss on both approvals
  - `hasBothApprovals()` - Check if both players approved
  - `performCoinToss()` - Deterministic coin toss
  - `setFirstPlayer()` - Set first player (deprecated)
  - `markPlayerDeckValid()` - Mark initial hand as valid
  - `transitionToSelectBenchPokemon()` - Transition after both set active
  - `markPlayerReadyToStart()` - Mark player ready after bench selection
  - `updateGameStateDuringDrawing()` - Update state during DRAWING_CARDS
  - `updateGameStateDuringSetup()` - Update state during setup phases
  - `startInitialSetup()` - Start initial setup
  - `completeInitialSetup()` - Complete setup and start first turn
  - `updateGameState()` - Update game state during turns
  - `endTurn()` - End current turn
  - `processBetweenTurns()` - Process between turns effects
  - `endMatch()` - End match with winner
  - `cancelMatch()` - Cancel match
  - `isTerminal()` - Check if match is in terminal state
  - `hasBothPlayers()` - Check if both players assigned
  - `getPlayerIdentifier()` - Get player identifier from player ID
  - `isPlayerTurn()` - Check if it's player's turn
  - `getOpponentId()` - Get opponent's ID

#### Domain Services
- **MatchStateMachineService** (`src/modules/match/domain/services/match-state-machine.service.ts`)
  - `canTransition()` - Validate state transitions
  - `validateAction()` - Validate player actions
  - `validateActionForPhase()` - Validate action for specific phase
  - `getNextPhase()` - Determine next phase after action
  - `checkWinConditions()` - Check all win conditions
  - `getAvailableActions()` - Get available actions for current state/phase

- **StartGameRulesValidatorService** (`src/modules/match/domain/services/start-game-rules-validator.service.ts`)
  - `validateHand()` - Validate hand against start game rules
  - `validateRule()` - Validate single rule
  - `validateBasicPokemon()` - Count Basic Pokemon in hand
  - `validateEnergyCard()` - Count Energy cards in hand

#### Use Cases
- **CreateMatchUseCase** - Create new match
- **JoinMatchUseCase** - Player joins match, auto deck validation
- **ValidateMatchDecksUseCase** - Validate both decks against tournament
- **PerformCoinTossUseCase** - Perform coin toss (legacy)
- **DrawInitialCardsUseCase** - Draw and validate initial 7 cards
- **StartMatchUseCase** - Start match (legacy, reshuffle logic)
- **ExecuteTurnActionUseCase** - Execute player actions
  - `APPROVE_MATCH` action
  - `DRAW_INITIAL_CARDS` action
  - `SET_ACTIVE_POKEMON` action
  - `PLAY_POKEMON` action
  - `COMPLETE_INITIAL_SETUP` action
  - `DRAW_CARD` action
  - `ATTACH_ENERGY` action
  - `PLAY_TRAINER` action
  - `EVOLVE_POKEMON` action
  - `RETREAT` action
  - `ATTACK` action
  - `USE_ABILITY` action
  - `END_TURN` action
  - `CONCEDE` action
- **GetMatchStateUseCase** - Get match state from player perspective
- **EndMatchUseCase** - End match with winner
- **ListMatchesUseCase** - List matches for a player

### Deck Module

#### Domain Entities
- **Deck Entity** (`src/modules/deck/domain/entities/deck.entity.ts`)
  - Constructor validation
  - `setName()` - Update deck name
  - `setTournamentId()` - Set tournament association
  - `setValid()` - Set validation status
  - `addCard()` - Add card to deck
  - `removeCard()` - Remove card from deck
  - `updateCardQuantity()` - Update card quantity
  - `performBasicValidation()` - Basic deck validation (size, copies)
  - `getTotalCardCount()` - Get total card count
  - `getCardQuantity()` - Get quantity of specific card

#### Use Cases
- **CreateDeckUseCase** - Create new deck
- **UpdateDeckUseCase** - Update deck (name, cards)
- **GetDeckByIdUseCase** - Get deck by ID
- **DeleteDeckUseCase** - Delete deck
- **ValidateDeckAgainstTournamentUseCase** - Validate deck against tournament rules
- **ListDecksUseCase** - List decks

### Tournament Module

#### Domain Entities
- **Tournament Entity** (`src/modules/tournament/domain/entities/tournament.entity.ts`)
  - Constructor validation
  - `setName()` - Update name
  - `setDescription()` - Update description
  - `setStatus()` - Update status with validation
  - `setOfficial()` - Set official flag
  - `addBannedSet()` - Add banned set
  - `removeBannedSet()` - Remove banned set
  - `isSetAllowed()` - Check if set is allowed
  - `addBannedCard()` - Add banned card
  - `removeBannedCard()` - Remove banned card
  - `isCardBanned()` - Check if card is banned
  - `addRestrictedCard()` - Add restricted card
  - `removeRestrictedCard()` - Remove restricted card
  - `getMaxCopiesForCard()` - Get max copies for card
  - `setDeckRules()` - Update deck rules
  - `setStartGameRules()` - Update start game rules
  - `addSavedDeck()` - Add saved deck
  - `removeSavedDeck()` - Remove saved deck
  - `setStartDate()` - Set start date
  - `setEndDate()` - Set end date
  - `setMaxParticipants()` - Set max participants
  - `setFormat()` - Set format
  - `setRegulationMarks()` - Set regulation marks

#### Use Cases
- **CreateTournamentUseCase** - Create new tournament
- **GetTournamentByIdUseCase** - Get tournament by ID
- **GetAllTournamentsUseCase** - List all tournaments
- **UpdateTournamentUseCase** - Update tournament
- **DeleteTournamentUseCase** - Delete tournament

### Card Module

#### Domain Entities
- **Card Entity** (`src/modules/card/domain/entities/card.entity.ts`)
  - Card properties and validation
  - Card type checks
  - Evolution stage checks

#### Domain Services
- **CardRuleValidatorService** - Validate card rules
- **AbilityEffectValidatorService** - Validate ability effects
- **AttackEffectValidatorService** - Validate attack effects
- **AttackPreconditionValidatorService** - Validate attack preconditions
- **ConditionValidatorService** - Validate conditions

---

## Spec Inventory

### Unit Tests (`.spec.ts`)

#### Match Module
- `match.entity.spec.ts` - Match entity unit tests
- `match-state-machine.service.spec.ts` - State machine service tests (if exists)
- `start-game-rules-validator.service.spec.ts` - Start game rules validator tests
- `start-match.use-case.reshuffle.spec.ts` - Start match reshuffle tests
- `match-state-response.dto.revealed-hand.spec.ts` - DTO tests

#### Deck Module
- `deck.entity.spec.ts` - Deck entity unit tests
- `create-deck.use-case.spec.ts` - Create deck use case tests
- `update-deck.use-case.spec.ts` - Update deck use case tests
- `get-deck-by-id.use-case.spec.ts` - Get deck use case tests
- `delete-deck.use-case.spec.ts` - Delete deck use case tests
- `validate-deck-against-tournament.use-case.spec.ts` - Deck validation tests
- `deck.mapper.spec.ts` - Deck mapper tests
- `validation-result.value-object.spec.ts` - Validation result tests
- `deck-card.value-object.spec.ts` - Deck card value object tests

#### Tournament Module
- `tournament.entity.spec.ts` - Tournament entity unit tests
- `tournament.entity.start-game-rules.spec.ts` - Start game rules tests
- `create-tournament.use-case.spec.ts` - Create tournament use case tests
- `tournament.mapper.start-game-rules.spec.ts` - Mapper tests
- `start-game-rules.value-object.spec.ts` - Start game rules value object tests
- `deck-rules.value-object.spec.ts` - Deck rules value object tests
- `restricted-card.value-object.spec.ts` - Restricted card value object tests

#### Card Module
- `card.entity.spec.ts` - Card entity unit tests
- `card-rule.validator.spec.ts` - Card rule validator tests
- `ability-effect.validator.spec.ts` - Ability effect validator tests
- `attack-effect.validator.spec.ts` - Attack effect validator tests
- `attack-precondition.validator.spec.ts` - Attack precondition validator tests
- `condition.validator.spec.ts` - Condition validator tests
- `card.mapper.spec.ts` - Card mapper tests
- `legacy-ability.adapter.spec.ts` - Legacy ability adapter tests
- Various value object specs

### E2E Tests (`.e2e-spec.ts`)

#### Match Module
- `match-gameplay-flow.e2e-spec.ts` - Full gameplay flow (draw, attach energy, evolve, end turn)
- `match-approval-flow.e2e-spec.ts` - Match approval and initial setup flow
- `match-deck-validation-failure.e2e-spec.ts` - Deck validation failure scenarios
- `card-dealing.e2e-spec.ts` - Card dealing and reshuffle scenarios

#### Card Module
- `card-read.e2e-spec.ts` - Card preview API tests
- `card-load.e2e-spec.ts` - Card available sets tests

#### Other
- `app.e2e-spec.ts` - App controller tests
- `match-spec-cleanup.e2e-spec.ts` - Match cleanup tests

---

## Coverage Matrix

### Match Module

| Business Logic Component | Unit Test | E2E Test | Coverage Status |
|--------------------------|-----------|---------|-----------------|
| **Match Entity** |
| Constructor validation | ✅ | ✅ | Covered |
| `assignPlayer()` | ✅ | ✅ | Covered |
| `markDeckValidationComplete()` | ✅ | ✅ | Covered |
| `approveMatch()` | ✅ | ✅ | Covered |
| `hasBothApprovals()` | ❌ | ✅ | Partial |
| `performCoinToss()` | ❌ | ✅ | Partial |
| `setFirstPlayer()` | ✅ | ❌ | Partial |
| `markPlayerDeckValid()` | ❌ | ✅ | Partial |
| `transitionToSelectBenchPokemon()` | ❌ | ✅ | Partial |
| `markPlayerReadyToStart()` | ❌ | ✅ | Partial |
| `updateGameStateDuringDrawing()` | ❌ | ✅ | Partial |
| `updateGameStateDuringSetup()` | ❌ | ✅ | Partial |
| `startInitialSetup()` | ❌ | ❌ | **Missing** |
| `completeInitialSetup()` | ❌ | ✅ | Partial |
| `updateGameState()` | ❌ | ✅ | Partial |
| `endTurn()` | ❌ | ✅ | Partial |
| `processBetweenTurns()` | ❌ | ❌ | **Missing** |
| `endMatch()` | ❌ | ❌ | **Missing** |
| `cancelMatch()` | ❌ | ✅ | Partial |
| `isTerminal()` | ❌ | ❌ | **Missing** |
| `hasBothPlayers()` | ❌ | ✅ | Partial |
| `getPlayerIdentifier()` | ❌ | ✅ | Partial |
| `isPlayerTurn()` | ❌ | ✅ | Partial |
| `getOpponentId()` | ❌ | ✅ | Partial |
| **MatchStateMachineService** |
| `canTransition()` | ❌ | ✅ | Partial |
| `validateAction()` | ❌ | ✅ | Partial |
| `validateActionForPhase()` | ❌ | ❌ | **Missing** |
| `getNextPhase()` | ❌ | ❌ | **Missing** |
| `checkWinConditions()` | ❌ | ❌ | **Missing** |
| `getAvailableActions()` | ❌ | ✅ | Partial |
| **StartGameRulesValidatorService** |
| `validateHand()` | ✅ | ✅ | Covered |
| `validateRule()` | ✅ | ✅ | Covered |
| `validateBasicPokemon()` | ✅ | ✅ | Covered |
| `validateEnergyCard()` | ✅ | ✅ | Covered |
| **Use Cases** |
| CreateMatchUseCase | ❌ | ✅ | Partial |
| JoinMatchUseCase | ❌ | ✅ | Partial |
| ValidateMatchDecksUseCase | ❌ | ✅ | Partial |
| PerformCoinTossUseCase | ❌ | ❌ | **Missing** |
| DrawInitialCardsUseCase | ❌ | ✅ | Partial |
| StartMatchUseCase | ✅ | ❌ | Partial |
| ExecuteTurnActionUseCase | ❌ | ✅ | Partial |
| - APPROVE_MATCH | ❌ | ✅ | Partial |
| - DRAW_INITIAL_CARDS | ❌ | ✅ | Partial |
| - SET_ACTIVE_POKEMON | ❌ | ✅ | Partial |
| - PLAY_POKEMON | ❌ | ✅ | Partial |
| - COMPLETE_INITIAL_SETUP | ❌ | ✅ | Partial |
| - DRAW_CARD | ❌ | ✅ | Partial |
| - ATTACH_ENERGY | ❌ | ✅ | Partial |
| - PLAY_TRAINER | ❌ | ❌ | **Missing** |
| - EVOLVE_POKEMON | ❌ | ✅ | Partial |
| - RETREAT | ❌ | ❌ | **Missing** |
| - ATTACK | ❌ | ❌ | **Missing** |
| - USE_ABILITY | ❌ | ❌ | **Missing** |
| - END_TURN | ❌ | ✅ | Partial |
| - CONCEDE | ❌ | ❌ | **Missing** |
| GetMatchStateUseCase | ❌ | ✅ | Partial |
| EndMatchUseCase | ❌ | ❌ | **Missing** |
| ListMatchesUseCase | ❌ | ✅ | Partial |

### Deck Module

| Business Logic Component | Unit Test | E2E Test | Coverage Status |
|--------------------------|-----------|---------|-----------------|
| **Deck Entity** |
| Constructor validation | ✅ | ❌ | Partial |
| `setName()` | ✅ | ❌ | Partial |
| `setTournamentId()` | ✅ | ❌ | Partial |
| `setValid()` | ✅ | ❌ | Partial |
| `addCard()` | ✅ | ❌ | Partial |
| `removeCard()` | ✅ | ❌ | Partial |
| `updateCardQuantity()` | ✅ | ❌ | Partial |
| `performBasicValidation()` | ✅ | ❌ | Partial |
| `getTotalCardCount()` | ✅ | ❌ | Partial |
| `getCardQuantity()` | ✅ | ❌ | Partial |
| **Use Cases** |
| CreateDeckUseCase | ✅ | ❌ | Partial |
| UpdateDeckUseCase | ✅ | ❌ | Partial |
| GetDeckByIdUseCase | ✅ | ❌ | Partial |
| DeleteDeckUseCase | ✅ | ❌ | Partial |
| ValidateDeckAgainstTournamentUseCase | ✅ | ❌ | Partial |
| ListDecksUseCase | ❌ | ❌ | **Missing** |

### Tournament Module

| Business Logic Component | Unit Test | E2E Test | Coverage Status |
|--------------------------|-----------|---------|-----------------|
| **Tournament Entity** |
| Constructor validation | ✅ | ❌ | Partial |
| `setName()` | ✅ | ❌ | Partial |
| `setDescription()` | ✅ | ❌ | Partial |
| `setStatus()` | ✅ | ❌ | Partial |
| `setOfficial()` | ✅ | ❌ | Partial |
| `addBannedSet()` | ✅ | ❌ | Partial |
| `removeBannedSet()` | ✅ | ❌ | Partial |
| `isSetAllowed()` | ✅ | ❌ | Partial |
| `addBannedCard()` | ✅ | ❌ | Partial |
| `removeBannedCard()` | ✅ | ❌ | Partial |
| `isCardBanned()` | ✅ | ❌ | Partial |
| `addRestrictedCard()` | ✅ | ❌ | Partial |
| `removeRestrictedCard()` | ✅ | ❌ | Partial |
| `getMaxCopiesForCard()` | ✅ | ❌ | Partial |
| `setDeckRules()` | ✅ | ❌ | Partial |
| `setStartGameRules()` | ✅ | ❌ | Partial |
| `addSavedDeck()` | ✅ | ❌ | Partial |
| `removeSavedDeck()` | ✅ | ❌ | Partial |
| `setStartDate()` | ✅ | ❌ | Partial |
| `setEndDate()` | ✅ | ❌ | Partial |
| `setMaxParticipants()` | ✅ | ❌ | Partial |
| `setFormat()` | ✅ | ❌ | Partial |
| `setRegulationMarks()` | ✅ | ❌ | Partial |
| **Use Cases** |
| CreateTournamentUseCase | ✅ | ❌ | Partial |
| GetTournamentByIdUseCase | ❌ | ❌ | **Missing** |
| GetAllTournamentsUseCase | ❌ | ❌ | **Missing** |
| UpdateTournamentUseCase | ❌ | ❌ | **Missing** |
| DeleteTournamentUseCase | ❌ | ❌ | **Missing** |

### Card Module

| Business Logic Component | Unit Test | E2E Test | Coverage Status |
|--------------------------|-----------|---------|-----------------|
| **Card Entity** | ✅ | ✅ | Covered |
| **Card Validators** | ✅ | ❌ | Partial |
| **Value Objects** | ✅ | ❌ | Partial |

---

## Coverage Gaps

### Critical Missing Coverage (High Priority)

#### Match Module
1. **Match Entity Methods** (Unit Tests)
   - `startInitialSetup()` - No unit tests
   - `processBetweenTurns()` - No unit tests
   - `endMatch()` - No unit tests
   - `isTerminal()` - No unit tests
   - `hasBothApprovals()` - No unit tests
   - `performCoinToss()` - No unit tests
   - `markPlayerDeckValid()` - No unit tests
   - `transitionToSelectBenchPokemon()` - No unit tests
   - `markPlayerReadyToStart()` - No unit tests
   - `updateGameStateDuringDrawing()` - No unit tests
   - `updateGameStateDuringSetup()` - No unit tests
   - `completeInitialSetup()` - No unit tests
   - `updateGameState()` - No unit tests
   - `endTurn()` - No unit tests
   - `cancelMatch()` - No unit tests
   - Helper methods: `hasBothPlayers()`, `getPlayerIdentifier()`, `isPlayerTurn()`, `getOpponentId()`

2. **MatchStateMachineService** (Unit Tests)
   - `canTransition()` - No unit tests
   - `validateAction()` - No unit tests
   - `validateActionForPhase()` - No unit tests
   - `getNextPhase()` - No unit tests
   - `checkWinConditions()` - No unit tests
   - `getAvailableActions()` - No unit tests

3. **Use Cases** (Unit Tests)
   - `CreateMatchUseCase` - No unit tests
   - `JoinMatchUseCase` - No unit tests
   - `ValidateMatchDecksUseCase` - No unit tests
   - `PerformCoinTossUseCase` - No unit tests
   - `DrawInitialCardsUseCase` - No unit tests
   - `ExecuteTurnActionUseCase` - No unit tests
   - `GetMatchStateUseCase` - No unit tests
   - `EndMatchUseCase` - No unit tests
   - `ListMatchesUseCase` - No unit tests

4. **Gameplay Actions** (E2E Tests)
   - `PLAY_TRAINER` action - No E2E tests
   - `RETREAT` action - No E2E tests
   - `ATTACK` action - No E2E tests
   - `USE_ABILITY` action - No E2E tests
   - `CONCEDE` action - No E2E tests

5. **Win Conditions** (E2E Tests)
   - Prize cards win condition - No E2E tests
   - No Pokemon win condition - No E2E tests
   - Deck out win condition - No E2E tests
   - Concede win condition - No E2E tests

6. **Between Turns Processing** (E2E Tests)
   - Status effect processing (poison, burn) - No E2E tests
   - BETWEEN_TURNS abilities - No E2E tests
   - Turn transition logic - No E2E tests

### Medium Priority Missing Coverage

#### Deck Module
1. **E2E Tests** - All deck use cases lack E2E tests
   - Create deck E2E
   - Update deck E2E
   - Delete deck E2E
   - Validate deck E2E
   - List decks E2E

#### Tournament Module
1. **Use Cases** (Unit Tests)
   - `GetTournamentByIdUseCase` - No unit tests
   - `GetAllTournamentsUseCase` - No unit tests
   - `UpdateTournamentUseCase` - No unit tests
   - `DeleteTournamentUseCase` - No unit tests

2. **E2E Tests** - All tournament use cases lack E2E tests

### Low Priority Missing Coverage

1. **Edge Cases** - Many edge cases not covered
2. **Error Scenarios** - Some error paths not tested
3. **Integration Tests** - Limited integration between modules

---

## Coverage Statistics

### Overall Coverage
- **Match Module**: ~40% unit test coverage, ~60% E2E coverage
- **Deck Module**: ~80% unit test coverage, ~0% E2E coverage
- **Tournament Module**: ~60% unit test coverage, ~0% E2E coverage
- **Card Module**: ~90% unit test coverage, ~20% E2E coverage

### By Layer
- **Domain Entities**: ~70% coverage
- **Domain Services**: ~50% coverage
- **Use Cases**: ~30% coverage
- **Controllers**: ~20% coverage (via E2E)

---

## Recommendations

### Immediate Actions
1. **Add unit tests for Match Entity methods** - Critical for domain logic
2. **Add unit tests for MatchStateMachineService** - Core state machine logic
3. **Add unit tests for all Match Use Cases** - Application layer coverage
4. **Add E2E tests for gameplay actions** - PLAY_TRAINER, RETREAT, ATTACK, USE_ABILITY, CONCEDE
5. **Add E2E tests for win conditions** - All four win conditions

### Short-term Actions
1. **Add E2E tests for Deck module** - Complete deck lifecycle
2. **Add unit tests for Tournament use cases** - Complete tournament operations
3. **Add E2E tests for Tournament module** - Tournament lifecycle
4. **Add tests for between turns processing** - Status effects and abilities

### Long-term Actions
1. **Increase integration test coverage** - Test module interactions
2. **Add performance tests** - For critical paths
3. **Add property-based tests** - For complex business logic
4. **Add mutation testing** - To verify test quality

---

## Notes

- E2E tests provide good coverage for happy paths but miss edge cases
- Unit tests are missing for most use cases (application layer)
- Domain services need more comprehensive unit test coverage
- Win condition logic is not tested end-to-end
- Gameplay actions beyond basic flow are not tested


