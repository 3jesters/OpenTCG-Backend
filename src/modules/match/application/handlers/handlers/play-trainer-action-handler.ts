import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { BaseActionHandler } from '../base-action-handler';
import { IActionHandler } from '../action-handler.interface';
import { ExecuteActionDto } from '../../dto';
import {
  Match,
  PlayerIdentifier,
  GameState,
  TurnPhase,
  PlayerActionType,
  ActionSummary,
} from '../../../domain';
import { Card } from '../../../../card/domain/entities';
import { CardType } from '../../../../card/domain/enums/card-type.enum';
import { TrainerActionData } from '../../../domain/types/trainer-action-data.types';
import { TrainerEffectExecutorService } from '../../../domain/services/trainer-effect-executor.service';
import { TrainerEffectValidatorService } from '../../../domain/services/trainer-effect-validator.service';
import { IMatchRepository } from '../../../domain/repositories';
import { MatchStateMachineService } from '../../../domain/services';
import { IGetCardByIdUseCase } from '../../../../card/application/ports/card-use-cases.interface';
import { v4 as uuidv4 } from 'uuid';

/**
 * Play Trainer Action Handler
 * Handles playing trainer cards during MAIN_PHASE
 */
@Injectable()
export class PlayTrainerActionHandler
  extends BaseActionHandler
  implements IActionHandler
{
  constructor(
    @Inject(IMatchRepository)
    protected readonly matchRepository: IMatchRepository,
    protected readonly stateMachineService: MatchStateMachineService,
    @Inject(IGetCardByIdUseCase)
    protected readonly getCardByIdUseCase: IGetCardByIdUseCase,
    private readonly trainerEffectExecutor: TrainerEffectExecutorService,
    private readonly trainerEffectValidator: TrainerEffectValidatorService,
  ) {
    super(matchRepository, stateMachineService, getCardByIdUseCase);
  }

  async execute(
    dto: ExecuteActionDto,
    match: Match,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    cardsMap: Map<string, Card>,
  ): Promise<Match> {
    const actionData = dto.actionData as unknown as TrainerActionData;
    const cardId = actionData.cardId;

    if (gameState.phase !== TurnPhase.MAIN_PHASE) {
      throw new BadRequestException(
        `Cannot play trainer card in phase ${gameState.phase}. Must be MAIN_PHASE`,
      );
    }

    if (!cardId) {
      throw new BadRequestException('cardId is required');
    }

    const playerState = gameState.getPlayerState(playerIdentifier);
    const opponentState = gameState.getOpponentState(playerIdentifier);

    // Check if trainer card is in hand
    if (!playerState.hand.includes(cardId)) {
      throw new BadRequestException('Trainer card must be in hand');
    }

    // Find the index of the played card in hand (first occurrence)
    const playedCardIndex = playerState.hand.indexOf(cardId);

    // Get card from batch-loaded map to determine trainer effect
    const card = await this.getCardEntity(cardId, cardsMap);

    if (card.cardType !== CardType.TRAINER) {
      throw new BadRequestException('Card must be a trainer card');
    }

    if (!card.trainerEffects || card.trainerEffects.length === 0) {
      throw new BadRequestException('Trainer card must have trainerEffects');
    }

    // Validate that if trainer requires discarding from hand,
    // the selected card is not the same trainer card that was just played
    const hasDiscardHandEffect = card.trainerEffects.some(
      (effect) => effect.effectType === 'DISCARD_HAND',
    );

    if (
      hasDiscardHandEffect &&
      'handCardId' in actionData &&
      actionData.handCardId
    ) {
      // Validate that the selected card is in hand
      if (!playerState.hand.includes(actionData.handCardId)) {
        throw new BadRequestException('Selected card must be in hand');
      }

      // Prevent selecting the same trainer card that was just played
      if (actionData.handCardId === cardId) {
        let selectedIndex: number;

        if (actionData.handCardIndex !== undefined) {
          selectedIndex = actionData.handCardIndex;
          if (
            selectedIndex < 0 ||
            selectedIndex >= playerState.hand.length
          ) {
            throw new BadRequestException('Invalid handCardIndex');
          }
          if (playerState.hand[selectedIndex] !== actionData.handCardId) {
            throw new BadRequestException(
              'handCardId does not match card at handCardIndex',
            );
          }
        } else {
          selectedIndex = playerState.hand.indexOf(actionData.handCardId);
        }

        if (selectedIndex === playedCardIndex) {
          throw new BadRequestException(
            'Cannot select the same trainer card that was just played',
          );
        }
      }
    }

    // Validate actionData based on trainer effects
    const validation = this.trainerEffectValidator.validateActionData(
      card.trainerEffects,
      actionData,
      gameState,
      playerIdentifier,
    );

    if (!validation.isValid) {
      throw new BadRequestException(
        `Invalid actionData: ${validation.errors.join(', ')}`,
      );
    }

    // Execute trainer effects using metadata-driven executor
    const result = await this.trainerEffectExecutor.executeEffects(
      card.trainerEffects,
      actionData,
      gameState,
      playerIdentifier,
      cardsMap,
    );

    // Remove trainer card from hand and add to discard pile
    const updatedHand = [...result.playerState.hand];
    const cardIndexInUpdatedHand = updatedHand.indexOf(cardId);
    if (cardIndexInUpdatedHand === -1) {
      // Card might have been removed by an effect (shouldn't happen, but handle gracefully)
      // Continue without removing (card was already removed by effect)
    } else {
      updatedHand.splice(cardIndexInUpdatedHand, 1);
    }
    const finalHand = updatedHand;
    const finalDiscardPile = [...result.playerState.discardPile, cardId];
    const finalPlayerState = result.playerState
      .withHand(finalHand)
      .withDiscardPile(finalDiscardPile);

    // Update game state
    const updatedGameState =
      playerIdentifier === PlayerIdentifier.PLAYER1
        ? gameState
            .withPlayer1State(finalPlayerState)
            .withPlayer2State(result.opponentState)
        : gameState
            .withPlayer2State(finalPlayerState)
            .withPlayer1State(result.opponentState);

    const actionSummary = new ActionSummary(
      uuidv4(),
      playerIdentifier,
      PlayerActionType.PLAY_TRAINER,
      new Date(),
      actionData as unknown as Record<string, unknown>,
    );

    const finalGameState = updatedGameState.withAction(actionSummary);
    match.updateGameState(finalGameState);

    return await this.matchRepository.save(match);
  }
}

