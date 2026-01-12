import { Injectable, BadRequestException } from '@nestjs/common';
import { Match, PlayerIdentifier } from '../../domain';
import { IAiActionGeneratorService } from '../../application/ports/ai-action-generator.interface';
import { ExecuteActionDto } from '../../application/dto';

/**
 * Simple AI Action Generator Service
 * Stub implementation that throws BadRequestException
 * To be implemented later with actual AI logic
 */
@Injectable()
export class SimpleAiActionGeneratorService
  implements IAiActionGeneratorService
{
  /**
   * Generate an action for an AI player
   * Currently not implemented - throws BadRequestException
   */
  async generateAction(
    match: Match,
    playerId: string,
    playerIdentifier: PlayerIdentifier,
  ): Promise<ExecuteActionDto> {
    // TODO: Implement AI action generation logic
    // This will:
    // 1. Analyze match state
    // 2. Get available actions using AvailableActionsService
    // 3. Evaluate best action based on strategy
    // 4. Return ExecuteActionDto with selected action
    throw new BadRequestException(
      'AI action generation is not yet implemented',
    );
  }
}
