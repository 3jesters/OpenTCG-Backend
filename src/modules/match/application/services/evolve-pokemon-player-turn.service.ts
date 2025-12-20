import { Injectable, Inject } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import {
  Match,
  PlayerIdentifier,
  GameState,
  PlayerActionType,
  ActionSummary,
} from '../../domain';
import { IMatchRepository } from '../../domain/repositories';
import { EvolutionExecutionService } from './evolution-execution.service';
import { Card } from '../../../card/domain/entities';
import { v4 as uuidv4 } from 'uuid';

export interface EvolvePokemonPlayerTurnParams {
  dto: any; // ExecuteActionDto
  match: Match;
  gameState: GameState;
  playerIdentifier: PlayerIdentifier;
  cardsMap: Map<string, Card>;
  validatePokemonNotEvolvedThisTurn: (
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    instanceId: string,
    cardId: string,
  ) => void;
  validateEvolution: (
    currentPokemonCardId: string,
    evolutionCardId: string,
  ) => Promise<void>;
  getCardHp: (cardId: string) => Promise<number>;
}

@Injectable()
export class EvolvePokemonPlayerTurnService {
  constructor(
    private readonly evolutionExecutionService: EvolutionExecutionService,
    @Inject(IMatchRepository)
    private readonly matchRepository: IMatchRepository,
  ) {}

  /**
   * Execute evolve Pokemon action in PLAYER_TURN state
   */
  async executeEvolvePokemon(
    params: EvolvePokemonPlayerTurnParams,
  ): Promise<Match> {
    const {
      dto,
      match,
      gameState,
      playerIdentifier,
      cardsMap,
      validatePokemonNotEvolvedThisTurn,
      validateEvolution,
      getCardHp,
    } = params;

    // Validate request
    const { evolutionCardId, target } = this.validateEvolvePokemonRequest(
      dto.actionData,
    );

    // Execute evolution using execution service
    const result =
      await this.evolutionExecutionService.executeEvolvePokemon({
        evolutionCardId,
        target,
        gameState,
        playerIdentifier,
        cardsMap,
        validatePokemonNotEvolvedThisTurn,
        validateEvolution,
        getCardHp,
      });

    // Create action summary
    const actionSummary = new ActionSummary(
      uuidv4(),
      playerIdentifier,
      PlayerActionType.EVOLVE_POKEMON,
      new Date(),
      {
        evolutionCardId,
        target,
        targetInstanceId: result.targetInstanceId,
      },
    );

    const finalGameState = result.updatedGameState.withAction(actionSummary);

    // Update match
    match.updateGameState(finalGameState);

    return await this.matchRepository.save(match);
  }

  /**
   * Validate evolve Pokemon request
   */
  private validateEvolvePokemonRequest(actionData: any): {
    evolutionCardId: string;
    target: string;
  } {
    const evolutionCardId = actionData?.evolutionCardId;
    const target = actionData?.target;

    if (!evolutionCardId) {
      throw new BadRequestException('evolutionCardId is required');
    }
    if (!target) {
      throw new BadRequestException('target is required');
    }

    return { evolutionCardId, target };
  }
}

