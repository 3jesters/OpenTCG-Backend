import { Injectable, BadRequestException } from '@nestjs/common';
import { BaseActionHandler } from '../base-action-handler';
import { IActionHandler } from '../action-handler.interface';
import { ExecuteActionDto } from '../../dto';
import { Match, PlayerIdentifier, GameState } from '../../../domain';
import { Card } from '../../../../card/domain/entities';

/**
 * Confirm First Player Action Handler
 * Handles player confirming first player selection
 */
@Injectable()
export class ConfirmFirstPlayerActionHandler
  extends BaseActionHandler
  implements IActionHandler
{
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
    return await this.matchRepository.save(match);
  }
}

