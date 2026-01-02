import { Match } from '../../../domain/entities';
import { PlayerIdentifier } from '../../../domain/enums';
import { MatchOrmEntity } from '../entities/match.orm-entity';
import { MatchMapper, GameStateJson } from '../match.mapper';

/**
 * Match ORM Mapper
 * Maps between Match domain entity and MatchOrmEntity
 * Reuses MatchMapper for gameState JSON conversion
 */
export class MatchOrmMapper {
  /**
   * Convert ORM entity to domain entity
   */
  static toDomain(ormEntity: MatchOrmEntity): Match {
    // Convert gameState from JSONB to domain GameState
    const gameState = ormEntity.gameState
      ? MatchMapper.gameStateFromJson(ormEntity.gameState)
      : null;

    const match = Match.restore(
      ormEntity.id,
      ormEntity.tournamentId,
      ormEntity.createdAt,
      ormEntity.updatedAt,
      ormEntity.player1Id,
      ormEntity.player2Id,
      ormEntity.player1DeckId,
      ormEntity.player2DeckId,
      ormEntity.state,
      ormEntity.currentPlayer,
      ormEntity.firstPlayer,
      ormEntity.player1HasDrawnValidHand,
      ormEntity.player2HasDrawnValidHand,
      ormEntity.player1HasSetPrizeCards,
      ormEntity.player2HasSetPrizeCards,
      ormEntity.player1ReadyToStart,
      ormEntity.player2ReadyToStart,
      ormEntity.player1HasConfirmedFirstPlayer,
      ormEntity.player2HasConfirmedFirstPlayer,
      ormEntity.startedAt,
      ormEntity.endedAt,
      ormEntity.winnerId,
      ormEntity.result,
      ormEntity.winCondition,
      ormEntity.cancellationReason,
      gameState,
      ormEntity.player1HasApprovedMatch,
      ormEntity.player2HasApprovedMatch,
    );

    // Restore player types if present
    if (ormEntity.player1Type !== null && ormEntity.player1Type !== undefined) {
      match.setPlayerType(PlayerIdentifier.PLAYER1, ormEntity.player1Type);
    }
    if (ormEntity.player2Type !== null && ormEntity.player2Type !== undefined) {
      match.setPlayerType(PlayerIdentifier.PLAYER2, ormEntity.player2Type);
    }

    return match;
  }

  /**
   * Convert domain entity to ORM entity
   */
  static toOrm(domain: Match): MatchOrmEntity {
    const ormEntity = new MatchOrmEntity();
    
    ormEntity.id = domain.id;
    ormEntity.tournamentId = domain.tournamentId;
    ormEntity.player1Id = domain.player1Id;
    ormEntity.player2Id = domain.player2Id;
    ormEntity.player1DeckId = domain.player1DeckId;
    ormEntity.player2DeckId = domain.player2DeckId;
    ormEntity.player1Type = domain.player1Type;
    ormEntity.player2Type = domain.player2Type;
    ormEntity.state = domain.state;
    ormEntity.currentPlayer = domain.currentPlayer;
    ormEntity.firstPlayer = domain.firstPlayer;
    ormEntity.player1HasDrawnValidHand = domain.player1HasDrawnValidHand;
    ormEntity.player2HasDrawnValidHand = domain.player2HasDrawnValidHand;
    ormEntity.player1HasSetPrizeCards = domain.player1HasSetPrizeCards;
    ormEntity.player2HasSetPrizeCards = domain.player2HasSetPrizeCards;
    ormEntity.player1ReadyToStart = domain.player1ReadyToStart;
    ormEntity.player2ReadyToStart = domain.player2ReadyToStart;
    ormEntity.player1HasConfirmedFirstPlayer = domain.player1HasConfirmedFirstPlayer;
    ormEntity.player2HasConfirmedFirstPlayer = domain.player2HasConfirmedFirstPlayer;
    ormEntity.player1HasApprovedMatch = domain.player1HasApprovedMatch;
    ormEntity.player2HasApprovedMatch = domain.player2HasApprovedMatch;
    ormEntity.createdAt = domain.createdAt;
    ormEntity.updatedAt = domain.updatedAt;
    ormEntity.startedAt = domain.startedAt;
    ormEntity.endedAt = domain.endedAt;
    ormEntity.winnerId = domain.winnerId;
    ormEntity.result = domain.result;
    ormEntity.winCondition = domain.winCondition;
    ormEntity.cancellationReason = domain.cancellationReason;
    
    // Convert gameState from domain GameState to JSONB
    ormEntity.gameState = domain.gameState
      ? MatchMapper.gameStateToJson(domain.gameState)
      : null;

    return ormEntity;
  }
}

