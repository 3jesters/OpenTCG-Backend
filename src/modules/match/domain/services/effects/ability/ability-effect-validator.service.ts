import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { Ability } from '../../../../../card/domain/value-objects/ability.value-object';
import { AbilityActivationType } from '../../../../../card/domain/enums/ability-activation-type.enum';
import { UsageLimit } from '../../../../../card/domain/enums/usage-limit.enum';
import { StatusEffect } from '../../../enums/status-effect.enum';
import { GameState } from '../../../value-objects/game-state.value-object';
import { PlayerIdentifier } from '../../../enums/player-identifier.enum';
import { AbilityActionData } from '../../../types/ability-action-data.types';
import { CardInstance } from '../../../value-objects/card-instance.value-object';
import { AbilityEffectType } from '../../../../../card/domain/enums/ability-effect-type.enum';
import { IGetCardByIdUseCase } from '../../../../../card/application/ports/card-use-cases.interface';
import { Card } from '../../../../../card/domain/entities';
import { EnergySource } from '../../../../../card/domain/enums/energy-source.enum';
import { EnergyType } from '../../../../../card/domain/enums/energy-type.enum';
import { PokemonType } from '../../../../../card/domain/enums/pokemon-type.enum';
import { CardType } from '../../../../../card/domain/enums/card-type.enum';
import { TargetType } from '../../../../../card/domain/enums/target-type.enum';
import { PokemonPosition } from '../../../enums/pokemon-position.enum';

/**
 * Validation result
 */
export interface AbilityValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Ability Effect Validator Service
 * Validates ability usage and actionData structure
 */
@Injectable()
export class AbilityEffectValidatorService {
  constructor(
    @Inject(IGetCardByIdUseCase)
    private readonly getCardByIdUseCase: IGetCardByIdUseCase,
  ) {}

  /**
   * Get card entity from batch-loaded map or fetch individually
   */
  private async getCardEntity(
    cardId: string,
    cardsMap?: Map<string, Card>,
  ): Promise<Card> {
    if (cardsMap) {
      const card = cardsMap.get(cardId);
      if (card) {
        return card;
      }
    }
    // Fallback to individual query if not in map
    return await this.getCardByIdUseCase.getCardEntity(cardId);
  }

  /**
   * Validate ability can be used and actionData structure
   */
  async validateAbilityUsage(
    ability: Ability,
    actionData: AbilityActionData,
    pokemon: CardInstance,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    cardsMap?: Map<string, Card>,
  ): Promise<AbilityValidationResult> {
    const errors: string[] = [];

    // Validate ability exists
    if (!ability) {
      errors.push('Pokemon must have an ability');
      return { isValid: false, errors };
    }

    // Validate ability is ACTIVATED type
    if (ability.activationType !== AbilityActivationType.ACTIVATED) {
      errors.push(
        `Ability "${ability.name}" is ${ability.activationType} and cannot be used via USE_ABILITY action`,
      );
      return { isValid: false, errors };
    }

    // Check if Pokemon has blocking status conditions
    // Many abilities specify "can't be used if [Pokemon] is Asleep, Confused, or Paralyzed"
    if (
      pokemon.hasStatusEffect(StatusEffect.ASLEEP) ||
      pokemon.hasStatusEffect(StatusEffect.CONFUSED) ||
      pokemon.hasStatusEffect(StatusEffect.PARALYZED)
    ) {
      const blockingStatuses = pokemon.statusEffects.filter(
        (s) =>
          s === StatusEffect.ASLEEP ||
          s === StatusEffect.CONFUSED ||
          s === StatusEffect.PARALYZED,
      );
      errors.push(
        `Ability "${ability.name}" cannot be used because Pokemon is ${blockingStatuses.join(', ')}`,
      );
      // Return early - no need to validate actionData if ability can't be used
      return { isValid: false, errors };
    }

    // Check usage limits
    if (ability.usageLimit === UsageLimit.ONCE_PER_TURN) {
      if (gameState.hasAbilityBeenUsed(playerIdentifier, actionData.cardId)) {
        errors.push(`Ability "${ability.name}" can only be used once per turn`);
      }
    }

    // Validate actionData structure matches ability effects
    const effectErrors = await this.validateActionDataForEffects(
      ability,
      actionData,
      gameState,
      playerIdentifier,
      cardsMap,
    );
    errors.push(...effectErrors);

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate actionData structure matches ability effect requirements
   */
  private async validateActionDataForEffects(
    ability: Ability,
    actionData: AbilityActionData,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    cardsMap?: Map<string, Card>,
  ): Promise<string[]> {
    const errors: string[] = [];
    const playerState = gameState.getPlayerState(playerIdentifier);
    const opponentState = gameState.getOpponentState(playerIdentifier);

    // Validate base fields
    if (!actionData.cardId) {
      errors.push('cardId is required');
    }
    if (!actionData.target) {
      errors.push('target is required');
    }

    // Validate each effect's requirements
    for (const effect of ability.effects) {
      const effectErrors = await this.validateEffectRequirements(
        effect,
        actionData,
        playerState,
        opponentState,
        gameState,
        playerIdentifier,
        cardsMap,
      );
      errors.push(...effectErrors);
    }

    return errors;
  }

  /**
   * Validate requirements for a specific effect
   */
  private async validateEffectRequirements(
    effect: any, // AbilityEffect union type
    actionData: AbilityActionData,
    playerState: any,
    opponentState: any,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    cardsMap?: Map<string, Card>,
  ): Promise<string[]> {
    const errors: string[] = [];

    switch (effect.effectType) {
      case AbilityEffectType.HEAL:
        // HEAL may target self or other Pokemon
        if (effect.target && effect.target !== TargetType.SELF) {
          // If targeting other Pokemon, targetPokemon should be provided
          if (!('targetPokemon' in actionData) || !actionData.targetPokemon) {
            errors.push(
              'targetPokemon is required for HEAL effect when targeting other Pokemon',
            );
          }
        }
        break;

      case AbilityEffectType.DRAW_CARDS:
        // No additional fields needed, uses count from effect
        break;

      case AbilityEffectType.SEARCH_DECK:
        if (
          !('selectedCardIds' in actionData) ||
          !Array.isArray(actionData.selectedCardIds)
        ) {
          errors.push('selectedCardIds is required for SEARCH_DECK effect');
        } else {
          const maxSearch = effect.count || 1;
          if (actionData.selectedCardIds.length > maxSearch) {
            errors.push(`SEARCH_DECK can select at most ${maxSearch} card(s)`);
          }
        }
        break;

      case AbilityEffectType.RETRIEVE_FROM_DISCARD:
        if (
          !('selectedCardIds' in actionData) ||
          !Array.isArray(actionData.selectedCardIds)
        ) {
          errors.push(
            'selectedCardIds is required for RETRIEVE_FROM_DISCARD effect',
          );
        } else {
          const maxRetrieve = effect.count || 1;
          if (actionData.selectedCardIds.length > maxRetrieve) {
            errors.push(
              `RETRIEVE_FROM_DISCARD can retrieve at most ${maxRetrieve} card(s)`,
            );
          }
        }
        break;

      case AbilityEffectType.ENERGY_ACCELERATION:
        // May need targetPokemon if not targeting self
        if (effect.target && effect.target !== TargetType.SELF) {
          if (!('targetPokemon' in actionData) || !actionData.targetPokemon) {
            errors.push(
              'targetPokemon is required for ENERGY_ACCELERATION effect when targeting other Pokemon',
            );
          }
        }
        // If source is hand or discard, selectedCardIds may be needed
        if (
          effect.source &&
          (effect.source === EnergySource.HAND ||
            effect.source === EnergySource.DISCARD)
        ) {
          if (
            !('selectedCardIds' in actionData) ||
            !Array.isArray(actionData.selectedCardIds) ||
            actionData.selectedCardIds.length === 0
          ) {
            errors.push(
              'selectedCardIds is required for ENERGY_ACCELERATION effect when source is hand or discard',
            );
          } else {
            // Validate energy type restrictions
            if (effect.energyType) {
              for (const cardId of actionData.selectedCardIds) {
                try {
                  const card = await this.getCardEntity(cardId, cardsMap);
                  if (card.cardType !== CardType.ENERGY) {
                    errors.push(
                      `Selected card ${cardId} is not an Energy card`,
                    );
                  } else if (card.energyType !== effect.energyType) {
                    errors.push(
                      `Selected energy card ${cardId} must be ${effect.energyType} Energy, but is ${card.energyType || 'unknown type'}`,
                    );
                  }
                } catch (error) {
                  errors.push(
                    `Failed to validate energy card ${cardId}: ${error.message}`,
                  );
                }
              }
            }
          }
        }
        // If source is SELF, selectedCardIds may be needed
        if (effect.source === EnergySource.SELF) {
          // Check if sourcePokemonTarget requires sourcePokemon selection
          const sourcePokemonTarget = effect.sourcePokemonTarget || TargetType.SELF;
          if (sourcePokemonTarget !== TargetType.SELF) {
            // Require sourcePokemon when sourcePokemonTarget is not SELF
            if (
              !('sourcePokemon' in actionData) ||
              !actionData.sourcePokemon
            ) {
              errors.push(
                'sourcePokemon is required for ENERGY_ACCELERATION effect when sourcePokemonTarget is not SELF',
              );
            }
          }

          if (
            !('selectedCardIds' in actionData) ||
            !Array.isArray(actionData.selectedCardIds) ||
            actionData.selectedCardIds.length === 0
          ) {
            errors.push(
              'selectedCardIds is required for ENERGY_ACCELERATION effect when source is self',
            );
          } else {
            // Validate energy type restrictions for SELF source
            if (effect.energyType) {
              for (const cardId of actionData.selectedCardIds) {
                try {
                  const card = await this.getCardEntity(cardId, cardsMap);
                  if (card.cardType !== CardType.ENERGY) {
                    errors.push(
                      `Selected card ${cardId} is not an Energy card`,
                    );
                  } else if (card.energyType !== effect.energyType) {
                    errors.push(
                      `Selected energy card ${cardId} must be ${effect.energyType} Energy, but is ${card.energyType || 'unknown type'}`,
                    );
                  }
                } catch (error) {
                  errors.push(
                    `Failed to validate energy card ${cardId}: ${error.message}`,
                  );
                }
              }
            }
          }
        }
        // Validate target Pokemon type restriction
        if (
          effect.targetPokemonType &&
          'targetPokemon' in actionData &&
          actionData.targetPokemon
        ) {
          try {
            const targetPosition = actionData.targetPokemon;
            let targetPokemonInstance: CardInstance | null = null;

            if (targetPosition === PokemonPosition.ACTIVE) {
              targetPokemonInstance = playerState.activePokemon;
            } else if (
              targetPosition === PokemonPosition.BENCH_0 ||
              targetPosition === PokemonPosition.BENCH_1 ||
              targetPosition === PokemonPosition.BENCH_2 ||
              targetPosition === PokemonPosition.BENCH_3 ||
              targetPosition === PokemonPosition.BENCH_4
            ) {
              const benchIndex = parseInt(
                targetPosition.replace('BENCH_', ''),
                10,
              );
              if (benchIndex >= 0 && benchIndex < playerState.bench.length) {
                targetPokemonInstance = playerState.bench[benchIndex];
              }
            }

            if (targetPokemonInstance) {
              const targetCard = await this.getCardEntity(
                targetPokemonInstance.cardId,
                cardsMap,
              );
              if (targetCard.cardType !== CardType.POKEMON) {
                errors.push(`Target ${targetPosition} is not a Pokemon`);
              } else if (targetCard.pokemonType !== effect.targetPokemonType) {
                errors.push(
                  `Target Pokemon must be ${effect.targetPokemonType} type, but is ${targetCard.pokemonType || 'unknown type'}`,
                );
              }
            }
          } catch (error) {
            errors.push(`Failed to validate target Pokemon: ${error.message}`);
          }
        }
        // Validate source Pokemon type restriction (for SELF source)
        if (effect.sourcePokemonType && effect.source === EnergySource.SELF) {
          // The source Pokemon is the one using the ability, which is already validated
          // This is more of a constraint check - we'd need the Pokemon instance to validate
          // This will be validated in the executor
        }
        break;

      case AbilityEffectType.SWITCH_POKEMON:
        if (!('benchPosition' in actionData) || !actionData.benchPosition) {
          errors.push('benchPosition is required for SWITCH_POKEMON effect');
        }
        break;

      case AbilityEffectType.DISCARD_FROM_HAND:
        if (
          !('handCardIds' in actionData) ||
          !Array.isArray(actionData.handCardIds) ||
          actionData.handCardIds.length === 0
        ) {
          errors.push('handCardIds is required for DISCARD_FROM_HAND effect');
        } else {
          const maxDiscard =
            effect.count === 'all' ? Infinity : effect.count || 1;
          if (
            effect.count !== 'all' &&
            actionData.handCardIds.length > maxDiscard
          ) {
            errors.push(
              `DISCARD_FROM_HAND can discard at most ${maxDiscard} card(s)`,
            );
          }
        }
        break;

      case AbilityEffectType.ATTACH_FROM_DISCARD:
        if (
          !('selectedCardIds' in actionData) ||
          !Array.isArray(actionData.selectedCardIds) ||
          actionData.selectedCardIds.length === 0
        ) {
          errors.push(
            'selectedCardIds is required for ATTACH_FROM_DISCARD effect',
          );
        }
        break;

      case AbilityEffectType.STATUS_CONDITION:
        if (!('targetPokemon' in actionData) || !actionData.targetPokemon) {
          errors.push('targetPokemon is required for STATUS_CONDITION effect');
        }
        break;

      case AbilityEffectType.PREVENT_DAMAGE:
      case AbilityEffectType.BOOST_ATTACK:
      case AbilityEffectType.BOOST_HP:
      case AbilityEffectType.REDUCE_DAMAGE:
        // These are passive-like effects, no additional actionData needed
        break;

      default:
        // Unknown effect type - don't fail validation, but log warning
        break;
    }

    return errors;
  }
}
