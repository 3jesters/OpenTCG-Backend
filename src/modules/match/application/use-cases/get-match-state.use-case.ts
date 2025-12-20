import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  Match,
  PlayerIdentifier,
  PlayerActionType,
} from '../../domain';
import { IMatchRepository } from '../../domain/repositories';
import { AvailableActionsService } from '../services';

/**
 * Get Match State Use Case
 * Retrieves the current state of a match for a specific player
 */
@Injectable()
export class GetMatchStateUseCase {
  constructor(
    @Inject(IMatchRepository)
    private readonly matchRepository: IMatchRepository,
    private readonly availableActionsService: AvailableActionsService,
  ) {}

  async execute(
    matchId: string,
    playerId: string,
  ): Promise<{ match: Match; availableActions: PlayerActionType[] }> {
    // Find match
    const match = await this.matchRepository.findById(matchId);
    if (!match) {
      throw new NotFoundException(`Match with ID ${matchId} not found`);
    }

    // Verify player is part of match
    const playerIdentifier = match.getPlayerIdentifier(playerId);
    if (!playerIdentifier) {
      throw new NotFoundException('Player is not part of this match');
    }

    // Get filtered available actions using service
    const availableActions =
      this.availableActionsService.getFilteredAvailableActions(
        match,
        playerIdentifier,
      );

    return { match, availableActions };
  }
}
