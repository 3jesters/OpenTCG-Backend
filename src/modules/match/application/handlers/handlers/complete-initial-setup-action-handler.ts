import { Injectable, Inject, BadRequestException, Logger } from '@nestjs/common';
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

/**
 * Complete Initial Setup Action Handler
 * Handles player completing initial setup (in SELECT_BENCH_POKEMON or INITIAL_SETUP state)
 * Auto-triggers AI players to play bench Pokemon when human completes setup
 */
@Injectable()
export class CompleteInitialSetupActionHandler
  extends BaseActionHandler
  implements IActionHandler
{
  private readonly logger = new Logger(CompleteInitialSetupActionHandler.name);

  constructor(
    @Inject(IMatchRepository)
    protected readonly matchRepository: IMatchRepository,
    protected readonly stateMachineService: MatchStateMachineService,
    @Inject(IGetCardByIdUseCase)
    protected readonly getCardByIdUseCase: IGetCardByIdUseCase,
    private readonly processActionUseCase: ProcessActionUseCase,
    private readonly playerTypeService: PlayerTypeService,
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
    // Handle complete initial setup in SELECT_BENCH_POKEMON state
    if (match.state === MatchState.SELECT_BENCH_POKEMON) {
      // Mark player as ready to start
      // This will automatically transition to FIRST_PLAYER_SELECTION when both are ready
      match.markPlayerReadyToStart(playerIdentifier);

      const savedMatch = await this.matchRepository.save(match);

      // If match is still in SELECT_BENCH_POKEMON state, auto-trigger the OTHER player (if AI) to play bench Pokemon
      // This happens when a human player completes setup before the AI has finished setting bench Pokemon
      if (savedMatch.state === MatchState.SELECT_BENCH_POKEMON) {
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

          // Check if opponent has already completed setup
          const opponentReadyToStart =
            opponentIdentifier === PlayerIdentifier.PLAYER1
              ? savedMatch.player1ReadyToStart
              : savedMatch.player2ReadyToStart;

          // Auto-trigger opponent AI player if applicable and hasn't completed setup yet
          if (
            opponentPlayerId &&
            this.playerTypeService.isAiPlayer(opponentPlayerId, savedMatch) &&
            !opponentReadyToStart
          ) {
            this.logger.debug(
              `Auto-triggering AI player ${opponentPlayerId} (${opponentIdentifier}) to play bench Pokemon after human completed setup for match ${savedMatch.id}`,
            );
            // Trigger AI to generate and execute action - ProcessActionUseCase will detect AI
            // and generate the appropriate action (PLAY_POKEMON or COMPLETE_INITIAL_SETUP)
            await this.processActionUseCase.execute(
              {
                playerId: opponentPlayerId,
                actionType: PlayerActionType.PLAY_POKEMON, // Placeholder - AI will generate its own action
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
        } catch (autoActionError) {
          // Log error but don't fail the action - auto-action is best effort
          this.logger.error(
            `Error during AI auto-action after human completed setup for match ${dto.matchId}: ${autoActionError instanceof Error ? autoActionError.message : String(autoActionError)}`,
            autoActionError instanceof Error ? autoActionError.stack : undefined,
          );
        }
      }

      // If match transitioned to FIRST_PLAYER_SELECTION, auto-trigger the first player (if AI) to confirm
      if (savedMatch.state === MatchState.FIRST_PLAYER_SELECTION) {
        try {
          // Determine which player should go first (we'll trigger the first one, or if both are AI, trigger player1)
          // The coin toss hasn't happened yet, so we'll trigger the current player (who just completed setup)
          // or the opponent if they're AI and haven't confirmed yet
          const currentPlayerId = dto.playerId;
          const opponentIdentifier =
            playerIdentifier === PlayerIdentifier.PLAYER1
              ? PlayerIdentifier.PLAYER2
              : PlayerIdentifier.PLAYER1;

          const opponentPlayerId =
            opponentIdentifier === PlayerIdentifier.PLAYER1
              ? savedMatch.player1Id
              : savedMatch.player2Id;

          // Check if opponent has already confirmed
          const opponentHasConfirmed =
            opponentIdentifier === PlayerIdentifier.PLAYER1
              ? savedMatch.player1HasConfirmedFirstPlayer
              : savedMatch.player2HasConfirmedFirstPlayer;

          // Auto-trigger current player if AI (they should confirm first to trigger coin toss)
          if (
            currentPlayerId &&
            this.playerTypeService.isAiPlayer(currentPlayerId, savedMatch)
          ) {
            this.logger.debug(
              `Auto-triggering AI player ${currentPlayerId} (${playerIdentifier}) to confirm first player for match ${savedMatch.id}`,
            );
            await this.processActionUseCase.execute(
              {
                playerId: currentPlayerId,
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
          // If current player is human, trigger opponent AI if applicable and hasn't confirmed
          else if (
            opponentPlayerId &&
            this.playerTypeService.isAiPlayer(opponentPlayerId, savedMatch) &&
            !opponentHasConfirmed
          ) {
            this.logger.debug(
              `Auto-triggering AI opponent ${opponentPlayerId} (${opponentIdentifier}) to confirm first player for match ${savedMatch.id}`,
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
            `Error during AI auto-confirm first player for match ${dto.matchId}: ${autoConfirmError instanceof Error ? autoConfirmError.message : String(autoConfirmError)}`,
            autoConfirmError instanceof Error ? autoConfirmError.stack : undefined,
          );
        }
      }

      // Don't call completeInitialSetup() here - it will be called automatically
      // by confirmFirstPlayer() after both players confirm the first player selection
      return savedMatch;
    }

    // Handle complete initial setup in INITIAL_SETUP state (legacy)
    if (match.state === MatchState.INITIAL_SETUP) {
      const playerState = gameState.getPlayerState(playerIdentifier);
      if (!playerState.activePokemon) {
        throw new BadRequestException(
          'Must set active Pokemon before completing initial setup',
        );
      }

      // Check if both players have completed setup
      const player1State = gameState.player1State;
      const player2State = gameState.player2State;

      if (player1State.activePokemon && player2State.activePokemon) {
        // Both players have set active Pokemon, transition to PLAYER_TURN
        match.completeInitialSetup();
      }

      return await this.matchRepository.save(match);
    }

    throw new BadRequestException(
      `Cannot complete initial setup in state ${match.state}`,
    );
  }
}

