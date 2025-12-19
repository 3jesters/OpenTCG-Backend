import { Injectable, Inject } from '@nestjs/common';
import { BaseActionHandler } from '../base-action-handler';
import { IActionHandler } from '../action-handler.interface';
import { ExecuteActionDto } from '../../dto';
import { Match, PlayerIdentifier, GameState } from '../../../domain';
import { Card } from '../../../../card/domain/entities';
import { SetPrizeCardsUseCase } from '../../use-cases/set-prize-cards.use-case';
import { IMatchRepository } from '../../../domain/repositories';
import { MatchStateMachineService } from '../../../domain/services';
import { IGetCardByIdUseCase } from '../../../../card/application/ports/card-use-cases.interface';

/**
 * Set Prize Cards Action Handler
 * Handles player setting prize cards (delegates to SetPrizeCardsUseCase)
 */
@Injectable()
export class SetPrizeCardsActionHandler
  extends BaseActionHandler
  implements IActionHandler
{
  constructor(
    @Inject(IMatchRepository)
    protected readonly matchRepository: IMatchRepository,
    protected readonly stateMachineService: MatchStateMachineService,
    @Inject(IGetCardByIdUseCase)
    protected readonly getCardByIdUseCase: IGetCardByIdUseCase,
    private readonly setPrizeCardsUseCase: SetPrizeCardsUseCase,
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
    return await this.setPrizeCardsUseCase.execute(dto.matchId, dto.playerId);
  }
}

