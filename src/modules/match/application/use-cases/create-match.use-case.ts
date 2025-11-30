import { Injectable, Inject } from '@nestjs/common';
import { Match, PlayerIdentifier } from '../../domain';
import { IMatchRepository } from '../../domain/repositories';
import { CreateMatchDto } from '../dto';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create Match Use Case
 * Creates a new match in the CREATED state
 */
@Injectable()
export class CreateMatchUseCase {
  constructor(
    @Inject(IMatchRepository)
    private readonly matchRepository: IMatchRepository,
  ) {}

  async execute(dto: CreateMatchDto): Promise<Match> {
    // Use provided ID or generate unique ID
    const id = dto.id || uuidv4();

    // Create domain entity
    const match = new Match(id, dto.tournamentId);

    // Optionally assign player 1 if provided
    if (dto.player1Id && dto.player1DeckId) {
      match.assignPlayer(
        dto.player1Id,
        dto.player1DeckId,
        PlayerIdentifier.PLAYER1,
      );
    }

    // Save to repository
    return await this.matchRepository.save(match);
  }
}

