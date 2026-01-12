import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { BaseActionHandler } from '../base-action-handler';
import { IActionHandler } from '../action-handler.interface';
import { ExecuteActionDto } from '../../dto';
import {
  Match,
  PlayerIdentifier,
  GameState,
  MatchState,
  PlayerActionType,
} from '../../../domain';
import { Card } from '../../../../card/domain/entities';
import { IMatchRepository } from '../../../domain/repositories';
import { MatchStateMachineService } from '../../../domain/services';
import { IGetCardByIdUseCase } from '../../../../card/application/ports/card-use-cases.interface';
import { ProcessActionUseCase } from '../../use-cases/process-action.use-case';
import { PlayerTypeService } from '../../services';
import { ILogger } from '../../../../../shared/application/ports/logger.interface';

/**
 * Confirm First Player Action Handler
 * Handles player confirming first player selection
 * Auto-triggers AI players to confirm after human confirms
 */
@Injectable()
export class ConfirmFirstPlayerActionHandler
  extends BaseActionHandler
  implements IActionHandler
{
  constructor(
    @Inject(IMatchRepository)
    protected readonly matchRepository: IMatchRepository,
    protected readonly stateMachineService: MatchStateMachineService,
    @Inject(IGetCardByIdUseCase)
    protected readonly getCardByIdUseCase: IGetCardByIdUseCase,
    private readonly processActionUseCase: ProcessActionUseCase,
    private readonly playerTypeService: PlayerTypeService,
    @Inject(ILogger)
    private readonly logger: ILogger,
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
    try {
      match.confirmFirstPlayer(playerIdentifier);
    } catch (error) {
      if (error.message && error.message.includes('already confirmed')) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }

    const savedMatch = await this.matchRepository.save(match);

    // If match is still in FIRST_PLAYER_SELECTION state, auto-trigger the OTHER player (if AI) to confirm
    // This happens when a human player confirms before the AI has confirmed
    if (savedMatch.state === MatchState.FIRST_PLAYER_SELECTION) {
      try {
        // Determine the opponent player identifier
        const opponentIdentifier =
          playerIdentifier === PlayerIdentifier.PLAYER1
            ? PlayerIdentifier.PLAYER2
            : PlayerIdentifier.PLAYER1;

        // Get opponent player ID
        const opponentPlayerId =
          opponentIdentifier === PlayerIdentifier.PLAYER1
            ? savedMatch.player1Id
            : savedMatch.player2Id;

        // Check if opponent has already confirmed
        const opponentHasConfirmed =
          opponentIdentifier === PlayerIdentifier.PLAYER1
            ? savedMatch.player1HasConfirmedFirstPlayer
            : savedMatch.player2HasConfirmedFirstPlayer;

        // Auto-trigger opponent AI player if applicable and hasn't confirmed yet
        if (
          opponentPlayerId &&
          this.playerTypeService.isAiPlayer(opponentPlayerId, savedMatch) &&
          !opponentHasConfirmed
        ) {
          this.logger.debug(
            'Auto-triggering AI player to confirm first player',
            'ConfirmFirstPlayerActionHandler',
            {
              matchId: savedMatch.id,
              aiPlayerId: opponentPlayerId,
              opponentIdentifier,
            },
          );
          await this.processActionUseCase.execute(
            {
              playerId: opponentPlayerId,
              actionType: PlayerActionType.CONFIRM_FIRST_PLAYER,
              actionData: {},
            },
            savedMatch.id,
          );
          // Reload match after AI action
          const updatedMatch = await this.matchRepository.findById(dto.matchId);
          if (updatedMatch) {
            return updatedMatch;
          }
        }
      } catch (autoConfirmError) {
        // Log error but don't fail the action - auto-action is best effort
        this.logger.error(
          'Error during AI auto-confirm first player',
          'ConfirmFirstPlayerActionHandler',
          {
            matchId: dto.matchId,
            error:
              autoConfirmError instanceof Error
                ? autoConfirmError.message
                : String(autoConfirmError),
            stack:
              autoConfirmError instanceof Error
                ? autoConfirmError.stack
                : undefined,
          },
        );
      }
    }

    // If match transitioned to PLAYER_TURN, auto-trigger first player if AI
    if (
      savedMatch.state === MatchState.PLAYER_TURN &&
      savedMatch.currentPlayer
    ) {
      try {
        const firstPlayerId =
          savedMatch.currentPlayer === PlayerIdentifier.PLAYER1
            ? savedMatch.player1Id
            : savedMatch.player2Id;

        this.logger.debug(
          'Checking if first player is AI',
          'ConfirmFirstPlayerActionHandler',
          {
            matchId: savedMatch.id,
            currentPlayer: savedMatch.currentPlayer,
            firstPlayerId,
            firstPlayer: savedMatch.firstPlayer,
          },
        );

        if (
          firstPlayerId &&
          this.playerTypeService.isAiPlayer(firstPlayerId, savedMatch)
        ) {
          this.logger.info(
            'Auto-triggering AI first player to start match',
            'ConfirmFirstPlayerActionHandler',
            {
              matchId: savedMatch.id,
              aiPlayerId: firstPlayerId,
              playerIdentifier: savedMatch.currentPlayer,
              phase: savedMatch.gameState?.phase,
            },
          );

          await this.processActionUseCase.execute(
            {
              playerId: firstPlayerId,
              actionType: PlayerActionType.DRAW_CARD, // Placeholder - AI will generate
              actionData: {},
            },
            savedMatch.id,
          );

          // Reload match after AI action
          const updatedMatch = await this.matchRepository.findById(dto.matchId);
          if (updatedMatch) {
            return updatedMatch;
          }
        }
      } catch (error) {
        this.logger.error(
          'Error auto-triggering AI first player',
          'ConfirmFirstPlayerActionHandler',
          {
            matchId: savedMatch.id,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          },
        );
      }
    }

    return savedMatch;
  }
}
