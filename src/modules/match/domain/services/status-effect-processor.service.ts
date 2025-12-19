import { Injectable } from '@nestjs/common';
import { PlayerIdentifier } from '../enums';
import { StatusEffect } from '../enums/status-effect.enum';
import {
  CoinFlipConfiguration,
  CoinFlipState,
  GameState,
} from '../value-objects';
import { CoinFlipStatus } from '../enums/coin-flip-status.enum';
import { CoinFlipContext } from '../enums/coin-flip-context.enum';
import { CoinFlipCountType } from '../value-objects/coin-flip-configuration.value-object';
import { DamageCalculationType } from '../value-objects/coin-flip-configuration.value-object';

/**
 * Status Effect Processor Service
 * Processes status effects between turns (poison, burn, sleep, paralyze)
 * Domain service - contains business logic for status effect processing
 */
@Injectable()
export class StatusEffectProcessorService {
  /**
   * Process status effects between turns
   * - Apply poison/burn damage
   * - Create sleep wake-up coin flips
   * - Clear paralyzed status
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
        let updatedActive = activePokemon;

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

        // Clear paralyzed status at end of turn
        if (activePokemon.hasStatusEffect(StatusEffect.PARALYZED)) {
          updatedActive = updatedActive.withStatusEffectRemoved(
            StatusEffect.PARALYZED,
          );
        }

        // Create sleep wake-up coin flip if asleep
        if (activePokemon.hasStatusEffect(StatusEffect.ASLEEP)) {
          // Create coin flip state for sleep wake-up check
          const actionId = `${matchId}-turn${gameState.turnNumber}-sleep-wakeup-${activePokemon.instanceId}`;
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
            activePokemon.instanceId,
            'ASLEEP',
            actionId,
          );
          updatedGameState = updatedGameState.withCoinFlipState(coinFlipState);
        }

        if (updatedActive !== activePokemon) {
          updatedPlayerState =
            updatedPlayerState.withActivePokemon(updatedActive);
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

