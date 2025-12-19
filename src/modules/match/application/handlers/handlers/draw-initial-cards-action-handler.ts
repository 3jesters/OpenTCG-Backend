import { Injectable, Inject } from '@nestjs/common';
import { BaseActionHandler } from '../base-action-handler';
import { IActionHandler } from '../action-handler.interface';
import { ExecuteActionDto } from '../../dto';
import { Match, PlayerIdentifier, GameState } from '../../../domain';
import { Card } from '../../../../card/domain/entities';
import { DrawInitialCardsUseCase } from '../../use-cases/draw-initial-cards.use-case';
import { IMatchRepository } from '../../../domain/repositories';
import { MatchStateMachineService } from '../../../domain/services';
import { IGetCardByIdUseCase } from '../../../../card/application/ports/card-use-cases.interface';

/**
 * Draw Initial Cards Action Handler
 * Handles player drawing initial 7 cards (delegates to DrawInitialCardsUseCase)
 */
@Injectable()
export class DrawInitialCardsActionHandler
  extends BaseActionHandler
  implements IActionHandler
{
  constructor(
    @Inject(IMatchRepository)
    protected readonly matchRepository: IMatchRepository,
    protected readonly stateMachineService: MatchStateMachineService,
    @Inject(IGetCardByIdUseCase)
    protected readonly getCardByIdUseCase: IGetCardByIdUseCase,
    private readonly drawInitialCardsUseCase: DrawInitialCardsUseCase,
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
    const result = await this.drawInitialCardsUseCase.execute(
      dto.matchId,
      dto.playerId,
    );
    return result.match;
  }
}

