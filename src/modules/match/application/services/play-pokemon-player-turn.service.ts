import { Injectable, Inject } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import {
  Match,
  PlayerIdentifier,
  GameState,
  TurnPhase,
  PlayerActionType,
  ActionSummary,
} from '../../domain';
import { IMatchRepository } from '../../domain/repositories';
import { PlayPokemonExecutionService } from './play-pokemon-execution.service';
import { Card } from '../../../card/domain/entities';
import { v4 as uuidv4 } from 'uuid';

export interface PlayPokemonPlayerTurnParams {
  dto: any; // ExecuteActionDto
  match: Match;
  gameState: GameState;
  playerIdentifier: PlayerIdentifier;
  getCardEntity: (cardId: string) => Promise<Card>;
  getCardHp: (cardId: string) => Promise<number>;
}

@Injectable()
export class PlayPokemonPlayerTurnService {
  constructor(
    private readonly playPokemonExecutionService: PlayPokemonExecutionService,
    @Inject(IMatchRepository)
    private readonly matchRepository: IMatchRepository,
  ) {}

  /**
   * Execute play Pokemon action in PLAYER_TURN state (main phase)
   */
  async executePlayPokemon(
    params: PlayPokemonPlayerTurnParams,
  ): Promise<Match> {
    const {
      dto,
      match,
      gameState,
      playerIdentifier,
      getCardEntity,
      getCardHp,
    } = params;

    // Validate request
    const { cardId } = this.validatePlayPokemonRequest(dto.actionData, gameState);

    // Execute play Pokemon using execution service
    const result = await this.playPokemonExecutionService.executePlayPokemon({
      cardId,
      gameState,
      playerIdentifier,
      getCardEntity,
      getCardHp,
    });

    // Create action summary
    const actionSummary = new ActionSummary(
      uuidv4(),
      playerIdentifier,
      PlayerActionType.PLAY_POKEMON,
      new Date(),
      {
        cardId,
        benchPosition: result.benchPosition,
        instanceId: result.instanceId,
      },
    );

    const finalGameState = result.updatedGameState.withAction(actionSummary);

    // Update match
    match.updateGameState(finalGameState);

    return await this.matchRepository.save(match);
  }

  /**
   * Validate play Pokemon request
   */
  private validatePlayPokemonRequest(
    actionData: any,
    gameState: GameState,
  ): { cardId: string } {
    const cardId = actionData?.cardId;
    if (!cardId) {
      throw new BadRequestException('cardId is required');
    }

    // Validate phase
    if (gameState.phase !== TurnPhase.MAIN_PHASE) {
      throw new BadRequestException(
        `Cannot play Pokemon in phase ${gameState.phase}. Must be MAIN_PHASE`,
      );
    }

    return { cardId };
  }
}

