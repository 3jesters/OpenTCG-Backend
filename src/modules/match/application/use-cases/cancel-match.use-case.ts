import { Injectable, Inject, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { IMatchRepository } from '../../domain/repositories/match.repository.interface';
import { MatchState } from '../../domain/enums/match-state.enum';

@Injectable()
export class CancelMatchUseCase {
  constructor(
    @Inject(IMatchRepository)
    private readonly matchRepository: IMatchRepository,
  ) {}

  async execute(matchId: string, playerId: string): Promise<void> {
    // Find match
    const match = await this.matchRepository.findById(matchId);

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    // Validate match state is WAITING_FOR_PLAYERS
    if (match.state !== MatchState.WAITING_FOR_PLAYERS) {
      throw new BadRequestException(
        'Match can only be cancelled when in WAITING_FOR_PLAYERS state',
      );
    }

    // Validate playerId is a participant
    if (match.player1Id !== playerId && match.player2Id !== playerId) {
      throw new ForbiddenException('Only match participants can cancel a match');
    }

    // Cancel the match (sets state to CANCELLED)
    match.cancelMatch('Player cancelled match');

    // Delete match from repository
    await this.matchRepository.delete(matchId);
  }
}

