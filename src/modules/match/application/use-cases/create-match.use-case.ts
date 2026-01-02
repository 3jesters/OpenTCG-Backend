import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { Match, PlayerIdentifier, PlayerType, MatchState } from '../../domain';
import { IMatchRepository } from '../../domain/repositories';
import { CreateMatchDto } from '../dto';
import { v4 as uuidv4 } from 'uuid';
import { getAiPlayerById, AI_PLAYER_ID } from '../../domain/constants/ai-player.constants';
import { ValidateMatchDecksUseCase } from './validate-match-decks.use-case';

/**
 * Create Match Use Case
 * Creates a new match in the CREATED state
 * Supports creating matches vs AI player
 */
@Injectable()
export class CreateMatchUseCase {
  constructor(
    @Inject(IMatchRepository)
    private readonly matchRepository: IMatchRepository,
    private readonly validateMatchDecksUseCase: ValidateMatchDecksUseCase,
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
      // Set player1 type to HUMAN
      match.setPlayerType(PlayerIdentifier.PLAYER1, PlayerType.HUMAN);
    }

    // If vsAi is true, automatically assign AI player as player2
    if (dto.vsAi === true) {
      if (!dto.player1Id || !dto.player1DeckId) {
        throw new BadRequestException(
          'player1Id and player1DeckId are required when creating a match vs AI',
        );
      }

      if (!dto.aiDeckId) {
        throw new BadRequestException(
          'aiDeckId is required when creating a match vs AI',
        );
      }

      // Use provided AI player ID or default
      const aiPlayerId = dto.aiPlayerId || AI_PLAYER_ID;

      // Validate AI player exists
      const aiPlayer = getAiPlayerById(aiPlayerId);
      if (!aiPlayer) {
        throw new BadRequestException(
          `AI player with ID ${aiPlayerId} not found. Available AI players can be retrieved from /api/v1/matches/ai-players`,
        );
      }

      // Assign AI player with specified deck
      match.assignPlayer(
        aiPlayerId,
        dto.aiDeckId,
        PlayerIdentifier.PLAYER2,
      );
      // Set player2 type to AI
      match.setPlayerType(PlayerIdentifier.PLAYER2, PlayerType.AI);
    }

    // Save to repository
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
