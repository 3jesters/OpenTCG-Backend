import { Injectable, BadRequestException } from '@nestjs/common';
import { TrainerEffectDto } from '../../../../../card/presentation/dto/trainer-effect.dto';
import { TrainerEffectType } from '../../../../../card/domain/enums/trainer-effect-type.enum';
import { GameState } from '../../../value-objects/game-state.value-object';
import { PlayerIdentifier } from '../../../enums/player-identifier.enum';
import { TrainerActionData } from '../../../types/trainer-action-data.types';
import { PlayerGameState } from '../../../value-objects/player-game-state.value-object';

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Trainer Effect Validator Service
 * Validates actionData contains required fields based on trainerEffects
 */
@Injectable()
export class TrainerEffectValidatorService {
  /**
   * Validate actionData based on trainer effects
   */
  validateActionData(
    trainerEffects: TrainerEffectDto[],
    actionData: TrainerActionData,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
  ): ValidationResult {
    const errors: string[] = [];

    if (!trainerEffects || trainerEffects.length === 0) {
      errors.push('Trainer card must have trainerEffects');
      return { isValid: false, errors };
    }

    if (!actionData.cardId) {
      errors.push('cardId is required');
    }

    const playerState = gameState.getPlayerState(playerIdentifier);
    const opponentState = gameState.getOpponentState(playerIdentifier);

    // Validate each effect's requirements
    for (const effect of trainerEffects) {
      const effectErrors = this.validateEffectRequirements(
        effect,
        actionData,
        playerState,
        opponentState,
      );
      errors.push(...effectErrors);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate requirements for a specific effect
   */
  private validateEffectRequirements(
    effect: TrainerEffectDto,
    actionData: TrainerActionData,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
  ): string[] {
    const errors: string[] = [];

    switch (effect.effectType) {
      case TrainerEffectType.HEAL:
        if (!('target' in actionData) || !actionData.target) {
          errors.push('target is required for HEAL effect');
        }
        break;

      case TrainerEffectType.REMOVE_ENERGY:
        if (!('target' in actionData) || !actionData.target) {
          errors.push('target is required for REMOVE_ENERGY effect');
        }
        if (!('energyCardId' in actionData) || !actionData.energyCardId) {
          errors.push('energyCardId is required for REMOVE_ENERGY effect');
        }
        break;

      case TrainerEffectType.RETRIEVE_ENERGY:
        if (
          !('selectedCardIds' in actionData) ||
          !Array.isArray(actionData.selectedCardIds)
        ) {
          errors.push(
            'selectedCardIds is required for RETRIEVE_ENERGY effect (array, can be empty)',
          );
        } else {
          const maxRetrieve =
            typeof effect.value === 'number' ? effect.value : 2;
          if (actionData.selectedCardIds.length > maxRetrieve) {
            errors.push(
              `RETRIEVE_ENERGY can retrieve at most ${maxRetrieve} energy cards`,
            );
          }
        }
        break;

      case TrainerEffectType.DISCARD_HAND:
        if (!('handCardId' in actionData) || !actionData.handCardId) {
          errors.push('handCardId is required for DISCARD_HAND effect');
        }
        break;

      case TrainerEffectType.DISCARD_ENERGY:
        if (!('target' in actionData) || !actionData.target) {
          errors.push('target is required for DISCARD_ENERGY effect');
        }
        if (!('energyCardId' in actionData) || !actionData.energyCardId) {
          errors.push('energyCardId is required for DISCARD_ENERGY effect');
        }
        break;

      case TrainerEffectType.SWITCH_ACTIVE:
        if (!('benchPosition' in actionData) || !actionData.benchPosition) {
          errors.push('benchPosition is required for SWITCH_ACTIVE effect');
        }
        break;

      case TrainerEffectType.FORCE_SWITCH:
        if (!('benchPosition' in actionData) || !actionData.benchPosition) {
          errors.push('benchPosition is required for FORCE_SWITCH effect');
        }
        break;

      case TrainerEffectType.SEARCH_DECK:
        if (
          !('selectedCardIds' in actionData) ||
          !Array.isArray(actionData.selectedCardIds)
        ) {
          errors.push('selectedCardIds is required for SEARCH_DECK effect');
        }
        break;

      case TrainerEffectType.RETRIEVE_FROM_DISCARD:
        if (
          !('selectedCardIds' in actionData) ||
          !Array.isArray(actionData.selectedCardIds)
        ) {
          errors.push(
            'selectedCardIds is required for RETRIEVE_FROM_DISCARD effect',
          );
        }
        break;

      case TrainerEffectType.CURE_STATUS:
        if (!('target' in actionData) || !actionData.target) {
          errors.push('target is required for CURE_STATUS effect');
        }
        break;

      case TrainerEffectType.EVOLVE_POKEMON:
        if (!('target' in actionData) || !actionData.target) {
          errors.push('target is required for EVOLVE_POKEMON effect');
        }
        if (!('evolutionCardId' in actionData) || !actionData.evolutionCardId) {
          errors.push('evolutionCardId is required for EVOLVE_POKEMON effect');
        }
        break;

      case TrainerEffectType.DEVOLVE_POKEMON:
        if (!('target' in actionData) || !actionData.target) {
          errors.push('target is required for DEVOLVE_POKEMON effect');
        }
        break;

      case TrainerEffectType.RETURN_TO_HAND:
        if (!('target' in actionData) || !actionData.target) {
          errors.push('target is required for RETURN_TO_HAND effect');
        }
        break;

      case TrainerEffectType.RETURN_TO_DECK:
        if (!('target' in actionData) || !actionData.target) {
          errors.push('target is required for RETURN_TO_DECK effect');
        }
        break;

      case TrainerEffectType.PUT_INTO_PLAY:
        if (!('target' in actionData) || !actionData.target) {
          errors.push('target is required for PUT_INTO_PLAY effect');
        }
        if (!('pokemonCardId' in actionData) || !actionData.pokemonCardId) {
          errors.push('pokemonCardId is required for PUT_INTO_PLAY effect');
        }
        break;

      case TrainerEffectType.ATTACH_TO_POKEMON:
        if (!('target' in actionData) || !actionData.target) {
          errors.push('target is required for ATTACH_TO_POKEMON effect');
        }
        break;

      case TrainerEffectType.TRADE_CARDS:
        if (
          !('discardCardIds' in actionData) ||
          !Array.isArray(actionData.discardCardIds)
        ) {
          errors.push('discardCardIds is required for TRADE_CARDS effect');
        }
        if (
          !('selectedCardIds' in actionData) ||
          !Array.isArray(actionData.selectedCardIds)
        ) {
          errors.push('selectedCardIds is required for TRADE_CARDS effect');
        }
        break;

      // DRAW_CARDS, SHUFFLE_DECK don't require additional fields
      case TrainerEffectType.DRAW_CARDS:
      case TrainerEffectType.SHUFFLE_DECK:
        // No additional validation needed
        break;

      default:
        // Unknown effect type - will be handled by executor
        break;
    }

    return errors;
  }
}
