import { Injectable, BadRequestException } from '@nestjs/common';
import { BaseActionHandler } from '../base-action-handler';
import { IActionHandler } from '../action-handler.interface';
import { ExecuteActionDto } from '../../dto';
import { Match, PlayerIdentifier, GameState } from '../../../domain';
import { Card } from '../../../../card/domain/entities';

/**
 * Approve Match Action Handler
 * Handles player approving the match (during MATCH_APPROVAL state)
 */
@Injectable()
export class ApproveMatchActionHandler
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
      match.approveMatch(playerIdentifier);
    } catch (error) {
      // Check if player has already approved
      if (
        error instanceof Error &&
        (error.message.includes('has already approved') ||
          error.message.includes('already approved'))
      ) {
        throw new BadRequestException(error.message);
      }
      // Re-throw other errors
      throw error;
    }
    // After both approve, match transitions directly to DRAWING_CARDS
    // Coin toss will happen after both players complete initial setup
    return await this.matchRepository.save(match);
  }
}

