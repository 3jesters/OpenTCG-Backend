import { Injectable, Inject, Logger } from '@nestjs/common';
import { BaseActionHandler } from '../base-action-handler';
import { IActionHandler } from '../action-handler.interface';
import { ExecuteActionDto } from '../../dto';
import { Match, PlayerIdentifier, GameState, MatchState, PlayerActionType } from '../../../domain';
import { Card } from '../../../../card/domain/entities';
import { SetPrizeCardsUseCase } from '../../use-cases/set-prize-cards.use-case';
import { IMatchRepository } from '../../../domain/repositories';
import { MatchStateMachineService } from '../../../domain/services';
import { IGetCardByIdUseCase } from '../../../../card/application/ports/card-use-cases.interface';
import { ProcessActionUseCase } from '../../use-cases/process-action.use-case';
import { PlayerTypeService } from '../../services';

/**
 * Set Prize Cards Action Handler
 * Handles player setting prize cards (delegates to SetPrizeCardsUseCase)
 * Auto-triggers AI players to set prize cards if it's their turn
 */
@Injectable()
export class SetPrizeCardsActionHandler
  extends BaseActionHandler
  implements IActionHandler
{
  private readonly logger = new Logger(SetPrizeCardsActionHandler.name);

  constructor(
    @Inject(IMatchRepository)
    protected readonly matchRepository: IMatchRepository,
    protected readonly stateMachineService: MatchStateMachineService,
    @Inject(IGetCardByIdUseCase)
    protected readonly getCardByIdUseCase: IGetCardByIdUseCase,
    private readonly setPrizeCardsUseCase: SetPrizeCardsUseCase,
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
    // Delegate to existing use case
    const savedMatch = await this.setPrizeCardsUseCase.execute(dto.matchId, dto.playerId);

    // If match is still in SET_PRIZE_CARDS state, auto-trigger the OTHER player (if AI) to set prize cards
    if (savedMatch.state === MatchState.SET_PRIZE_CARDS) {
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

        // Check if opponent has set prize cards
        const opponentHasSetPrizeCards =
          opponentIdentifier === PlayerIdentifier.PLAYER1
            ? savedMatch.player1HasSetPrizeCards
            : savedMatch.player2HasSetPrizeCards;

        // Auto-trigger opponent AI player if applicable
        if (
          opponentPlayerId &&
          this.playerTypeService.isAiPlayer(opponentPlayerId, savedMatch) &&
          !opponentHasSetPrizeCards
        ) {
          this.logger.debug(
            `Auto-triggering AI player ${opponentPlayerId} (${opponentIdentifier}) to set prize cards for match ${savedMatch.id}`,
          );
          await this.processActionUseCase.execute(
            {
              playerId: opponentPlayerId,
              actionType: PlayerActionType.SET_PRIZE_CARDS,
              actionData: {},
            },
            savedMatch.id,
          );
          // Reload match after AI sets prize cards
          const updatedMatch = await this.matchRepository.findById(dto.matchId);
          if (updatedMatch) {
            return updatedMatch;
          }
        }
      } catch (autoSetPrizeError) {
        // Log error but don't fail the action - auto-set prize is best effort
        this.logger.error(
          `Error during AI auto-set prize cards for match ${dto.matchId}: ${autoSetPrizeError instanceof Error ? autoSetPrizeError.message : String(autoSetPrizeError)}`,
          autoSetPrizeError instanceof Error ? autoSetPrizeError.stack : undefined,
        );
      }
    }

    return savedMatch;
  }
}

