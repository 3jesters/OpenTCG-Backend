import { Injectable } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { GameState, PlayerGameState } from '../../../value-objects';
import { PlayerIdentifier } from '../../../enums';
import { Attack } from '../../../../../card/domain/value-objects/attack.value-object';
import { DiscardEnergyEffect } from '../../../../../card/domain/value-objects/attack-effect.value-object';
import { AttackEffectType } from '../../../../../card/domain/enums/attack-effect-type.enum';
import { TargetType } from '../../../../../card/domain/enums/target-type.enum';
import { CardInstance } from '../../../value-objects/card-instance.value-object';

export interface ProcessEnergyCostParams {
  gameState: GameState;
  playerIdentifier: PlayerIdentifier;
  attack: Attack;
  selectedEnergyIds: string[];
  validateEnergySelection: (
    selectedEnergyIds: string[],
    discardEffect: DiscardEnergyEffect,
    pokemon: CardInstance,
  ) => Promise<string | null>;
}

export interface ProcessEnergyCostResult {
  updatedGameState: GameState;
  updatedPlayerState: PlayerGameState;
}

/**
 * Attack Energy Cost Service
 * Handles energy discard as attack cost (before attack executes)
 */
@Injectable()
export class AttackEnergyCostService {
  /**
   * Process energy discard cost for an attack
   */
  async processEnergyCost(
    params: ProcessEnergyCostParams,
  ): Promise<ProcessEnergyCostResult> {
    const {
      gameState,
      playerIdentifier,
      attack,
      selectedEnergyIds,
      validateEnergySelection,
    } = params;

    const playerState = gameState.getPlayerState(playerIdentifier);

    if (!playerState.activePokemon) {
      throw new BadRequestException('No active Pokemon to attack with');
    }

    // Find discard energy cost effects (target: SELF)
    const discardEnergyCostEffects = attack.hasEffects()
      ? attack
          .getEffectsByType(AttackEffectType.DISCARD_ENERGY)
          .filter(
            (effect) =>
              (effect as DiscardEnergyEffect).target === TargetType.SELF,
          )
      : [];

    // If no energy cost effects, return unchanged state
    if (discardEnergyCostEffects.length === 0) {
      return {
        updatedGameState: gameState,
        updatedPlayerState: playerState,
      };
    }

    const discardEffect =
      discardEnergyCostEffects[0] as DiscardEnergyEffect;

    // Validate that energy selection was provided
    if (!selectedEnergyIds || selectedEnergyIds.length === 0) {
      throw new BadRequestException(
        JSON.stringify({
          error: 'ENERGY_SELECTION_REQUIRED',
          message: `This attack requires discarding ${discardEffect.amount === 'all' ? 'all' : discardEffect.amount} ${discardEffect.energyType ? discardEffect.energyType + ' ' : ''}Energy card(s)`,
          requirement: {
            amount: discardEffect.amount,
            energyType: discardEffect.energyType,
            target: 'self',
          },
          availableEnergy: playerState.activePokemon.attachedEnergy,
        }),
      );
    }

    // Validate energy selection
    const validationError = await validateEnergySelection(
      selectedEnergyIds,
      discardEffect,
      playerState.activePokemon,
    );
    if (validationError) {
      throw new BadRequestException(validationError);
    }

    // Discard energy BEFORE attack executes (this is a cost)
    const updatedAttachedEnergy = [
      ...playerState.activePokemon.attachedEnergy,
    ];
    for (const energyId of selectedEnergyIds) {
      const energyIndex = updatedAttachedEnergy.indexOf(energyId);
      if (energyIndex === -1) {
        throw new BadRequestException(
          `Energy card ${energyId} is not attached to this Pokemon`,
        );
      }
      updatedAttachedEnergy.splice(energyIndex, 1);
    }

    const updatedAttacker = playerState.activePokemon.withAttachedEnergy(
      updatedAttachedEnergy,
    );
    const updatedDiscardPile = [...playerState.discardPile, ...selectedEnergyIds];
    const updatedPlayerState = playerState
      .withActivePokemon(updatedAttacker)
      .withDiscardPile(updatedDiscardPile);

    const updatedGameState =
      playerIdentifier === PlayerIdentifier.PLAYER1
        ? gameState.withPlayer1State(updatedPlayerState)
        : gameState.withPlayer2State(updatedPlayerState);

    return {
      updatedGameState,
      updatedPlayerState,
    };
  }
}

