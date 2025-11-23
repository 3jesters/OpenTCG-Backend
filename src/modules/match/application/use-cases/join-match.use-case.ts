import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Match, PlayerIdentifier } from '../../domain';
import { IMatchRepository } from '../../domain/repositories';
import { JoinMatchDto } from '../dto';

/**
 * Join Match Use Case
 * Allows a player to join an existing match
 */
@Injectable()
export class JoinMatchUseCase {
  constructor(
    @Inject(IMatchRepository)
    private readonly matchRepository: IMatchRepository,
  ) {}

  async execute(dto: JoinMatchDto): Promise<Match> {
    // Find match
    const match = await this.matchRepository.findById(dto.matchId);
    if (!match) {
      throw new NotFoundException(`Match with ID ${dto.matchId} not found`);
    }

    // Determine which player slot to assign
    let playerIdentifier: PlayerIdentifier;
    if (match.player1Id === null) {
      playerIdentifier = PlayerIdentifier.PLAYER1;
    } else if (match.player2Id === null) {
      playerIdentifier = PlayerIdentifier.PLAYER2;
    } else {
      throw new Error('Match already has both players assigned');
    }

    // Assign player
    match.assignPlayer(dto.playerId, dto.deckId, playerIdentifier);

    // Save and return
    return await this.matchRepository.save(match);
  }
}

