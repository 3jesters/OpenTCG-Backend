import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import {
  Match,
  PlayerIdentifier,
  PlayerActionType,
  MatchState,
} from '../../domain';
import { IMatchRepository } from '../../domain/repositories';
import { ExecuteActionRequestDto } from '../../presentation/dto';
import { ExecuteActionDto } from '../dto';
import { ExecuteTurnActionUseCase } from './execute-turn-action.use-case';
import { PlayerTypeService } from '../services';
import { IAiActionGeneratorService } from '../ports/ai-action-generator.interface';
import { ILogger } from '../../../../shared/application/ports/logger.interface';

/**
 * Process Action Use Case
 * Orchestrates the player/computer distinction and delegates to ExecuteTurnActionUseCase
 */
@Injectable()
export class ProcessActionUseCase {
  constructor(
    @Inject(IMatchRepository)
    private readonly matchRepository: IMatchRepository,
    private readonly playerTypeService: PlayerTypeService,
    @Optional()
    @Inject(IAiActionGeneratorService)
    private readonly aiActionGeneratorService: IAiActionGeneratorService | null,
    private readonly executeTurnActionUseCase: ExecuteTurnActionUseCase,
    @Inject(ILogger)
    private readonly logger: ILogger,
  ) {}

  /**
   * Process an action request (from player or AI)
   * @param requestDto - The action request DTO
   * @param matchId - The match ID
   * @param actionCount - Current action count in recursive chain (default 0)
   * @returns Match and available actions
   */
  async execute(
    requestDto: ExecuteActionRequestDto,
    matchId: string,
    actionCount: number = 0,
  ): Promise<{ match: Match; availableActions: PlayerActionType[] }> {
    // Get match
    const match = await this.matchRepository.findById(matchId);
    if (!match) {
      throw new NotFoundException(`Match with ID ${matchId} not found`);
    }

    // Get player identifier
    const playerIdentifier = match.getPlayerIdentifier(requestDto.playerId);
    if (!playerIdentifier) {
      throw new BadRequestException('Player is not part of this match');
    }

    // Check if player is AI or human
    const isAi = this.playerTypeService.isAiPlayer(requestDto.playerId, match);

    this.logger.debug('Processing action', 'ProcessActionUseCase', {
      matchId,
      playerId: requestDto.playerId,
      playerIdentifier,
      isAi,
      actionType: requestDto.actionType,
      actionCount,
      matchState: match.state,
      currentPlayer: match.currentPlayer,
      phase: match.gameState?.phase,
    });

    let executeActionDto: ExecuteActionDto;

    if (isAi) {
      // AI player - generate action using AI service
      if (!this.aiActionGeneratorService) {
        throw new BadRequestException('AI action generation is not available');
      }

      this.logger.debug('Generating AI action', 'ProcessActionUseCase', {
        matchId,
        playerId: requestDto.playerId,
        playerIdentifier,
        actionCount,
      });

      executeActionDto = await this.aiActionGeneratorService.generateAction(
        match,
        requestDto.playerId,
        playerIdentifier,
      );

      this.logger.info('AI action generated', 'ProcessActionUseCase', {
        matchId,
        playerId: requestDto.playerId,
        playerIdentifier,
        generatedActionType: executeActionDto.actionType,
        actionCount,
      });
    } else {
      // Human player - use action from request
      executeActionDto = {
        matchId,
        playerId: requestDto.playerId,
        actionType: requestDto.actionType,
        actionData: requestDto.actionData,
      };
    }

    // Execute the action
    this.logger.debug('Executing action', 'ProcessActionUseCase', {
      matchId,
      playerId: executeActionDto.playerId,
      actionType: executeActionDto.actionType,
      actionCount,
    });

    const result =
      await this.executeTurnActionUseCase.execute(executeActionDto);

    this.logger.debug('Action executed', 'ProcessActionUseCase', {
      matchId,
      playerId: executeActionDto.playerId,
      actionType: executeActionDto.actionType,
      actionCount,
      newMatchState: result.match.state,
      newCurrentPlayer: result.match.currentPlayer,
      newPhase: result.match.gameState?.phase,
    });

    // Check if we should continue AI turn
    if (isAi && result.match.state === MatchState.PLAYER_TURN) {
      const updatedMatch = result.match;
      const currentPlayerId =
        updatedMatch.currentPlayer === PlayerIdentifier.PLAYER1
          ? updatedMatch.player1Id
          : updatedMatch.player2Id;

      const shouldContinue =
        currentPlayerId === requestDto.playerId &&
        executeActionDto.actionType !== PlayerActionType.END_TURN &&
        executeActionDto.actionType !== PlayerActionType.CONCEDE &&
        actionCount < 15 &&
        updatedMatch.state !== MatchState.MATCH_ENDED;

      this.logger.debug(
        'Evaluating AI turn continuation',
        'ProcessActionUseCase',
        {
          matchId,
          playerId: requestDto.playerId,
          currentPlayerId,
          actionType: executeActionDto.actionType,
          actionCount,
          maxActions: 15,
          matchState: updatedMatch.state,
          shouldContinue,
          reasons: {
            isSamePlayer: currentPlayerId === requestDto.playerId,
            isNotEndTurn:
              executeActionDto.actionType !== PlayerActionType.END_TURN,
            isNotConcede:
              executeActionDto.actionType !== PlayerActionType.CONCEDE,
            underLimit: actionCount < 15,
            matchNotEnded: updatedMatch.state !== MatchState.MATCH_ENDED,
          },
        },
      );

      if (shouldContinue) {
        this.logger.info('Continuing AI turn', 'ProcessActionUseCase', {
          matchId,
          playerId: requestDto.playerId,
          playerIdentifier,
          actionCount: actionCount + 1,
          previousAction: executeActionDto.actionType,
          phase: updatedMatch.gameState?.phase,
        });

        return await this.execute(
          {
            playerId: requestDto.playerId,
            actionType: PlayerActionType.DRAW_CARD, // Placeholder
            actionData: {},
          },
          matchId,
          actionCount + 1,
        );
      } else {
        if (actionCount >= 15) {
          this.logger.warn(
            'AI turn stopped: maximum actions reached',
            'ProcessActionUseCase',
            {
              matchId,
              playerId: requestDto.playerId,
              actionCount,
              maxActions: 15,
            },
          );
        } else if (executeActionDto.actionType === PlayerActionType.END_TURN) {
          this.logger.info(
            'AI turn ended: END_TURN action',
            'ProcessActionUseCase',
            {
              matchId,
              playerId: requestDto.playerId,
              actionCount,
            },
          );
        } else if (executeActionDto.actionType === PlayerActionType.CONCEDE) {
          this.logger.info(
            'AI turn ended: CONCEDE action',
            'ProcessActionUseCase',
            {
              matchId,
              playerId: requestDto.playerId,
              actionCount,
            },
          );
        } else if (updatedMatch.state === MatchState.MATCH_ENDED) {
          this.logger.info(
            'AI turn ended: match ended',
            'ProcessActionUseCase',
            {
              matchId,
              playerId: requestDto.playerId,
              actionCount,
            },
          );
        } else if (currentPlayerId !== requestDto.playerId) {
          this.logger.info(
            'AI turn ended: player changed',
            'ProcessActionUseCase',
            {
              matchId,
              playerId: requestDto.playerId,
              currentPlayerId,
              actionCount,
            },
          );
        }
      }
    }

    return result;
  }
}
