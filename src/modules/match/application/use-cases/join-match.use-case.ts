import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Match, PlayerIdentifier, MatchState } from '../../domain';
import { IMatchRepository } from '../../domain/repositories';
import { JoinMatchDto } from '../dto';
import { ValidateMatchDecksUseCase } from './validate-match-decks.use-case';

/**
 * Join Match Use Case
 * Allows a player to join an existing match
 * Automatically triggers deck validation when both players are assigned
 */
@Injectable()
export class JoinMatchUseCase {
  constructor(
    @Inject(IMatchRepository)
    private readonly matchRepository: IMatchRepository,
    private readonly validateMatchDecksUseCase: ValidateMatchDecksUseCase,
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

    // Save match first
    const savedMatch = await this.matchRepository.save(match);

    // If both players are now assigned and match is in DECK_VALIDATION state,
    // automatically validate decks
    if (
      savedMatch.hasBothPlayers() &&
      savedMatch.state === MatchState.DECK_VALIDATION
    ) {
      return await this.validateMatchDecksUseCase.execute(savedMatch.id);
    }

    return savedMatch;
  }
}

