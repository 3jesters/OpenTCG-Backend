# ExecuteTurnActionUseCase Refactoring Status

## Overview
This document tracks the progress of refactoring `ExecuteTurnActionUseCase` from a monolithic ~5500-line method into a strategy pattern with individual action handlers.

## Completed Phases

### Phase 0: Foundation ✅
- Created `IActionHandler` interface
- Created `BaseActionHandler` abstract class with common operations
- Created `ActionHandlerFactory` for routing actions to handlers
- Registered infrastructure in module

### Phase 1: Simplest Actions ✅
- `ConcedeActionHandler` - Handles match concession
- `ApproveMatchActionHandler` - Handles match approval
- `DrawInitialCardsActionHandler` - Delegates to existing use case

### Phase 2: Setup Actions ✅
- `SetPrizeCardsActionHandler` - Delegates to existing use case
- `SetActivePokemonSetupActionHandler` - Handles active Pokemon selection during setup
- `PlayPokemonSetupActionHandler` - Handles playing Pokemon to bench during setup
- `CompleteInitialSetupActionHandler` - Handles completing initial setup
- `ConfirmFirstPlayerActionHandler` - Handles first player confirmation

### Phase 3: Main Phase Actions ✅ (Partial)
- `DrawCardActionHandler` - Handles drawing a card during DRAW phase
- `SelectPrizeActionHandler` - Handles selecting prize cards after knockout
- **Remaining**: `AttachEnergyActionHandler`, `PlayPokemonMainPhaseActionHandler`, `EvolvePokemonActionHandler`

## Remaining Work

### Phase 4: Complex Actions (In Progress)
- `PlayTrainerActionHandler` - Needs extraction (~400 lines)
- `UseAbilityActionHandler` - Needs extraction (~200 lines)
- `EndTurnActionHandler` - Needs extraction (~300 lines)
- `GenerateCoinFlipActionHandler` - Needs extraction (~800 lines)

### Phase 5: Attack Handler (Pending)
- `AttackActionHandler` - Most complex, ~2000 lines
- Consider extracting helper services first:
  - `AttackExecutionService` - Damage calculation
  - `AttackCoinFlipService` - Coin flip logic
  - `AttackStatusEffectService` - Status effects

### Phase 6: Cleanup ✅
- Removed old if-else blocks for implemented handlers
- Simplified `execute()` method to route to handlers first
- Removed phase comments
- Kept old code only for:
  - ATTACK (handler not fully implemented)
  - GENERATE_COIN_FLIP confusion case (delegates back)
  - Actions without handlers: ATTACH_ENERGY, EVOLVE_POKEMON, PLAY_POKEMON (main phase), RETREAT
  - SET_ACTIVE_POKEMON in PLAYER_TURN state (no handler for this case)

## Current Architecture

```
ExecuteTurnActionUseCase
  ├── Validates action via State Machine
  ├── Batch loads cards
  ├── Routes to handler via ActionHandlerFactory
  └── Handlers execute action logic

ActionHandlerFactory
  ├── Maps PlayerActionType → IActionHandler
  └── Handlers registered in module

BaseActionHandler
  ├── Common operations (getCardEntity, getCardHp, checkWinConditions)
  └── All handlers extend this base class
```

## Dual Implementation Strategy

All handlers are implemented with dual implementation:
1. Try to use handler first (if registered)
2. Fallback to old code if handler not available
3. This allows incremental migration and easy rollback

## Next Steps

1. Complete Phase 3: Extract remaining main phase actions
2. Complete Phase 4: Extract complex actions
3. Complete Phase 5: Extract ATTACK handler (most critical)
4. Complete Phase 6: Cleanup and finalize

## Notes

- All handlers follow clean architecture principles
- Handlers are in application layer, state machine in domain layer
- Repository interfaces are injected, not direct database access
- Common operations extracted to BaseActionHandler
- State machine validates actions before handler execution

