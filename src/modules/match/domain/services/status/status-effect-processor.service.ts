import { Injectable, Inject } from '@nestjs/common';
import { PlayerIdentifier } from '../../enums';
import { StatusEffect } from '../../enums/status-effect.enum';
import {
  CardInstance,
  CoinFlipConfiguration,
  CoinFlipState,
  GameState,
} from '../../value-objects';
import { CoinFlipStatus } from '../../enums/coin-flip-status.enum';
import { CoinFlipContext } from '../../enums/coin-flip-context.enum';
import { CoinFlipCountType } from '../../value-objects/coin-flip-configuration.value-object';
import { DamageCalculationType } from '../../value-objects/coin-flip-configuration.value-object';
import { AttackKnockoutService } from '../attack/damage-application/attack-knockout.service';

/**
 * Status Effect Processor Service
 * Processes status effects between turns (poison, burn, sleep, paralyze)
 * Domain service - contains business logic for status effect processing
 */
@Injectable()
export class StatusEffectProcessorService {
  constructor(
    private readonly attackKnockout: AttackKnockoutService,
  ) {}

  /**
   * Process status effects between turns
   * - Apply poison/burn damage
   * - Create sleep wake-up coin flips
   * - Clear paralyzed status based on turn number tracking
   * - Handle knockouts from poison/burn damage
   * 
   * Note: Paralysis is removed at the end of the affected player's next turn.
   * We use turn number tracking to determine when to clear paralysis.
   */
  async processBetweenTurnsStatusEffects(
    gameState: GameState,
    matchId: string,
  ): Promise<GameState> {
    let updatedGameState = gameState;

    // Process both players' Pokemon
    for (const playerId of [
      PlayerIdentifier.PLAYER1,
      PlayerIdentifier.PLAYER2,
    ]) {
      const playerState = gameState.getPlayerState(playerId);
      let updatedPlayerState = playerState;

      // Process active Pokemon
      if (playerState.activePokemon) {
        const activePokemon = playerState.activePokemon;
        let updatedActive: CardInstance | null = activePokemon;

        // Apply poison damage
        if (activePokemon.hasStatusEffect(StatusEffect.POISONED)) {
          const poisonDamage = activePokemon.poisonDamageAmount || 10; // Default to 10
          const newHp = Math.max(0, updatedActive.currentHp - poisonDamage);
          updatedActive = updatedActive.withHp(newHp);
        }

        // Apply burn damage
        if (activePokemon.hasStatusEffect(StatusEffect.BURNED)) {
          const burnDamage = 20; // Always 20 for burn
          const newHp = Math.max(0, updatedActive.currentHp - burnDamage);
          updatedActive = updatedActive.withHp(newHp);
        }

        // Check for knockout after applying poison/burn damage
        if (updatedActive.currentHp === 0) {
          // Handle knockout using AttackKnockoutService
          const knockoutResult = this.attackKnockout.handleActiveKnockout({
            pokemon: updatedActive,
            playerState: updatedPlayerState,
          });
          updatedPlayerState = knockoutResult.updatedState;
          updatedActive = null; // Pokemon is knocked out
        }

        // Only process other status effects if Pokemon wasn't knocked out
        if (updatedActive !== null) {
          // Clear paralyzed status based on turn number tracking
          // Paralysis is removed at the end of the affected player's next turn
          // We check if the current turn number > the expected clear turn
          // (using > instead of >= because we clear at the END of the turn, not the START)
          if (updatedActive.hasStatusEffect(StatusEffect.PARALYZED)) {
            const shouldClear =
              updatedActive.paralysisClearsAtTurn !== undefined &&
              gameState.turnNumber > updatedActive.paralysisClearsAtTurn;
            
            if (shouldClear) {
              updatedActive = updatedActive.withStatusEffectRemoved(
                StatusEffect.PARALYZED,
              );
            }
          }

          // Create sleep wake-up coin flip if asleep
          if (updatedActive.hasStatusEffect(StatusEffect.ASLEEP)) {
            // Create coin flip state for sleep wake-up check
            const actionId = `${matchId}-turn${gameState.turnNumber}-sleep-wakeup-${updatedActive.instanceId}`;
            const sleepCoinFlipConfig = new CoinFlipConfiguration(
              CoinFlipCountType.FIXED,
              1,
              undefined,
              undefined,
              DamageCalculationType.BASE_DAMAGE,
              0, // No damage calculation for sleep wake-up check
            );
            const coinFlipState = new CoinFlipState(
              CoinFlipStatus.READY_TO_FLIP,
              CoinFlipContext.STATUS_CHECK,
              sleepCoinFlipConfig,
              [],
              undefined,
              updatedActive.instanceId,
              StatusEffect.ASLEEP,
              actionId,
            );
            updatedGameState = updatedGameState.withCoinFlipState(coinFlipState);
          }

          // Update player state if Pokemon was modified
          if (updatedActive !== activePokemon) {
            updatedPlayerState =
              updatedPlayerState.withActivePokemon(updatedActive);
          }
        } else {
          // Pokemon was knocked out, updatedPlayerState already has activePokemon set to null
          // No need to update again
        }
      }

      // Process bench Pokemon (poison and burn damage only, no sleep/paralyze)
      const updatedBench = playerState.bench.map((benchPokemon) => {
        let updated = benchPokemon;

        // Apply poison damage
        if (benchPokemon.hasStatusEffect(StatusEffect.POISONED)) {
          const poisonDamage = benchPokemon.poisonDamageAmount || 10;
          const newHp = Math.max(0, updated.currentHp - poisonDamage);
          updated = updated.withHp(newHp);
        }

        // Apply burn damage
        if (benchPokemon.hasStatusEffect(StatusEffect.BURNED)) {
          const burnDamage = 20;
          const newHp = Math.max(0, updated.currentHp - burnDamage);
          updated = updated.withHp(newHp);
        }

        return updated;
      });

      if (updatedBench.some((p, i) => p !== playerState.bench[i])) {
        updatedPlayerState = updatedPlayerState.withBench(updatedBench);
      }

      // Update game state with modified player state
      if (playerId === PlayerIdentifier.PLAYER1) {
        updatedGameState =
          updatedGameState.withPlayer1State(updatedPlayerState);
      } else {
        updatedGameState =
          updatedGameState.withPlayer2State(updatedPlayerState);
      }
    }

    return updatedGameState;
  }
}

