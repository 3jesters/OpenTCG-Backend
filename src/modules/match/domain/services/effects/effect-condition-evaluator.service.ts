import { Injectable, Logger } from '@nestjs/common';
import {
  GameState,
  PlayerGameState,
  CoinFlipResult,
} from '../../value-objects';
import { PlayerIdentifier } from '../../enums';
import { ConditionType } from '../../../../card/domain/enums/condition-type.enum';
import { Card } from '../../../../card/domain/entities';

/**
 * Effect Condition Evaluator Service
 * Evaluates conditions for attack effects and abilities
 */
@Injectable()
export class EffectConditionEvaluatorService {
  private readonly logger = new Logger(EffectConditionEvaluatorService.name);

  /**
   * Evaluate effect conditions to determine if effect should apply
   */
  async evaluateEffectConditions(
    conditions: any[], // Condition[] from card domain
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
    coinFlipResults?: CoinFlipResult[],
    getCardEntity?: (cardId: string) => Promise<Card>,
  ): Promise<boolean> {
    if (!conditions || conditions.length === 0) {
      return true; // No conditions = always apply
    }

    for (const condition of conditions) {
      switch (condition.type) {
        case ConditionType.ALWAYS:
          return true;

        case ConditionType.COIN_FLIP_SUCCESS:
          if (!coinFlipResults || coinFlipResults.length === 0) {
            return false;
          }
          // Check if any flip is heads
          const hasHeads = coinFlipResults.some((result) => result.isHeads());
          return hasHeads;

        case ConditionType.COIN_FLIP_FAILURE:
          if (!coinFlipResults || coinFlipResults.length === 0) {
            return false;
          }
          // Check if any flip is tails
          return coinFlipResults.some((result) => result.isTails());

        case ConditionType.SELF_HAS_DAMAGE:
          return playerState.activePokemon
            ? playerState.activePokemon.currentHp <
                playerState.activePokemon.maxHp
            : false;

        case ConditionType.OPPONENT_HAS_DAMAGE:
          return opponentState.activePokemon
            ? opponentState.activePokemon.currentHp <
                opponentState.activePokemon.maxHp
            : false;

        case ConditionType.SELF_HAS_ENERGY_TYPE:
          if (!condition.value?.energyType || !playerState.activePokemon) {
            return false;
          }
          // Check if any attached energy matches the required type
          if (!getCardEntity) {
            this.logger.warn(
              'getCardEntity not provided for SELF_HAS_ENERGY_TYPE condition',
            );
            return false;
          }
          for (const energyId of playerState.activePokemon.attachedEnergy) {
            try {
              const energyCard = await getCardEntity(energyId);
              if (energyCard.energyType === condition.value.energyType) {
                return true;
              }
            } catch {
              // Skip if card lookup fails
            }
          }
          return false;

        default:
          // Unknown condition type - default to false for safety
          this.logger.warn(`Unknown condition type: ${condition.type}`);
          return false;
      }
    }

    return true; // All conditions met
  }
}
