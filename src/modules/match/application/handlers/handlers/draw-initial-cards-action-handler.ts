import { Injectable, Inject, Logger } from '@nestjs/common';
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
import { DrawInitialCardsUseCase } from '../../use-cases/draw-initial-cards.use-case';
import { IMatchRepository } from '../../../domain/repositories';
import { MatchStateMachineService } from '../../../domain/services';
import { IGetCardByIdUseCase } from '../../../../card/application/ports/card-use-cases.interface';
import { ProcessActionUseCase } from '../../use-cases/process-action.use-case';
import { PlayerTypeService } from '../../services';

/**
 * Draw Initial Cards Action Handler
 * Handles player drawing initial 7 cards (delegates to DrawInitialCardsUseCase)
 * Auto-triggers AI players to draw if it's their turn
 */
@Injectable()
export class DrawInitialCardsActionHandler
  extends BaseActionHandler
  implements IActionHandler
{
  private readonly logger = new Logger(DrawInitialCardsActionHandler.name);

  constructor(
    @Inject(IMatchRepository)
    protected readonly matchRepository: IMatchRepository,
    protected readonly stateMachineService: MatchStateMachineService,
    @Inject(IGetCardByIdUseCase)
    protected readonly getCardByIdUseCase: IGetCardByIdUseCase,
    private readonly drawInitialCardsUseCase: DrawInitialCardsUseCase,
    private readonly processActionUseCase: ProcessActionUseCase,
    private readonly playerTypeService: PlayerTypeService,
  ) {
    super(matchRepository, stateMachineService, getCardByIdUseCase);
  }

  async execute(
    dto: ExecuteActionDto,
    match: Match,
    gameState: GameState | null,
    playerIdentifier: PlayerIdentifier,
    cardsMap: Map<string, Card>,
  ): Promise<Match> {
    // Delegate to existing use case
    const result = await this.drawInitialCardsUseCase.execute(
      dto.matchId,
      dto.playerId,
    );

    let savedMatch = result.match;

    // If match is still in DRAWING_CARDS state, auto-trigger the OTHER player (if AI) to draw
    // Only check the opponent, not the player who just drew
    if (savedMatch.state === MatchState.DRAWING_CARDS) {
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

        // Check if opponent has drawn
        const opponentHasDrawn =
          opponentIdentifier === PlayerIdentifier.PLAYER1
            ? savedMatch.player1HasDrawnValidHand
            : savedMatch.player2HasDrawnValidHand;

        // Auto-trigger opponent AI player if applicable
        if (
          opponentPlayerId &&
          this.playerTypeService.isAiPlayer(opponentPlayerId, savedMatch) &&
          !opponentHasDrawn
        ) {
          this.logger.debug(
            `Auto-triggering AI player ${opponentPlayerId} (${opponentIdentifier}) to draw initial cards for match ${savedMatch.id}`,
          );
          await this.processActionUseCase.execute(
            {
              playerId: opponentPlayerId,
              actionType: PlayerActionType.DRAW_INITIAL_CARDS,
              actionData: {},
            },
            savedMatch.id,
          );
          // Reload match after AI draws
          const updatedMatch = await this.matchRepository.findById(dto.matchId);
          if (updatedMatch) {
            savedMatch = updatedMatch;
          }
        }
      } catch (autoDrawError) {
        // Log error but don't fail the action - auto-draw is best effort
        // The current player's draw succeeded
        this.logger.error(
          `Error during AI auto-draw for match ${dto.matchId}: ${autoDrawError instanceof Error ? autoDrawError.message : String(autoDrawError)}`,
          autoDrawError instanceof Error ? autoDrawError.stack : undefined,
        );
      }
    }

    return savedMatch;
  }
}
