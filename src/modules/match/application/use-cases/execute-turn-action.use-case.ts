import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  Match,
  PlayerIdentifier,
  MatchState,
  PlayerActionType,
  MatchResult,
  WinCondition,
} from '../../domain';
import { IMatchRepository } from '../../domain/repositories';
import { MatchStateMachineService } from '../../domain/services';
import { ExecuteActionDto } from '../dto';

/**
 * Execute Turn Action Use Case
 * Executes a player action during their turn
 */
@Injectable()
export class ExecuteTurnActionUseCase {
  constructor(
    @Inject(IMatchRepository)
    private readonly matchRepository: IMatchRepository,
    private readonly stateMachineService: MatchStateMachineService,
  ) {}

  async execute(dto: ExecuteActionDto): Promise<Match> {
    // Find match
    const match = await this.matchRepository.findById(dto.matchId);
    if (!match) {
      throw new NotFoundException(`Match with ID ${dto.matchId} not found`);
    }

    // Get player identifier
    const playerIdentifier = match.getPlayerIdentifier(dto.playerId);
    if (!playerIdentifier) {
      throw new BadRequestException('Player is not part of this match');
    }

    // Validate action
    const validation = this.stateMachineService.validateAction(
      match.state,
      match.gameState?.phase || null,
      dto.actionType,
      match.currentPlayer,
      playerIdentifier,
    );

    if (!validation.isValid) {
      throw new BadRequestException(
        `Invalid action: ${validation.error || 'Unknown error'}`,
      );
    }

    // Handle concede
    if (dto.actionType === PlayerActionType.CONCEDE) {
      const opponentId = match.getOpponentId(dto.playerId);
      if (opponentId) {
        match.endMatch(
          opponentId,
          playerIdentifier === PlayerIdentifier.PLAYER1
            ? MatchResult.PLAYER2_WIN
            : MatchResult.PLAYER1_WIN,
          WinCondition.CONCEDE,
        );
      }
      return await this.matchRepository.save(match);
    }

    // For other actions, the game state would be updated here
    // This is a simplified version - full implementation would handle
    // each action type and update game state accordingly

    // Save and return
    return await this.matchRepository.save(match);
  }
}

