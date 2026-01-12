import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match, IMatchRepository, MatchState } from '../../domain';
import { MatchOrmEntity } from './entities';
import { MatchOrmMapper } from './mappers/match-orm.mapper';

/**
 * TypeORM Match Repository
 * Implements match persistence using PostgreSQL via TypeORM
 */
@Injectable()
export class TypeOrmMatchRepository implements IMatchRepository {
  constructor(
    @InjectRepository(MatchOrmEntity)
    private readonly matchEntityRepository: Repository<MatchOrmEntity>,
  ) {}

  /**
   * Find a match by its ID
   */
  async findById(id: string): Promise<Match | null> {
    const entity = await this.matchEntityRepository.findOne({
      where: { id },
    });
    return entity ? MatchOrmMapper.toDomain(entity) : null;
  }

  /**
   * Find all matches
   * Optionally filter by tournament ID or player ID
   */
  async findAll(tournamentId?: string, playerId?: string): Promise<Match[]> {
    const queryBuilder = this.matchEntityRepository.createQueryBuilder('match');

    if (tournamentId) {
      queryBuilder.where('match.tournamentId = :tournamentId', {
        tournamentId,
      });
    }

    if (playerId) {
      queryBuilder.andWhere(
        '(match.player1Id = :playerId OR match.player2Id = :playerId)',
        { playerId },
      );
    }

    const entities = await queryBuilder.getMany();
    return entities.map((entity) => MatchOrmMapper.toDomain(entity));
  }

  /**
   * Save a match (create or update)
   * Optimized to use UPDATE for existing matches to avoid duplicate SELECT queries
   */
  async save(match: Match): Promise<Match> {
    const entity = MatchOrmMapper.toOrm(match);

    // If match has an ID, use update() to avoid SELECT query that save() would do
    // This eliminates the duplicate query when updating an existing match
    if (match.id) {
      // Convert entity to plain object for update() method
      // Exclude id as it's used in the WHERE clause
      // Include updatedAt from domain entity (already set correctly by domain logic)
      const updateData = {
        tournamentId: entity.tournamentId,
        player1Id: entity.player1Id,
        player2Id: entity.player2Id,
        player1DeckId: entity.player1DeckId,
        player2DeckId: entity.player2DeckId,
        player1Type: entity.player1Type,
        player2Type: entity.player2Type,
        state: entity.state,
        currentPlayer: entity.currentPlayer,
        firstPlayer: entity.firstPlayer,
        player1HasDrawnValidHand: entity.player1HasDrawnValidHand,
        player2HasDrawnValidHand: entity.player2HasDrawnValidHand,
        player1HasSetPrizeCards: entity.player1HasSetPrizeCards,
        player2HasSetPrizeCards: entity.player2HasSetPrizeCards,
        player1ReadyToStart: entity.player1ReadyToStart,
        player2ReadyToStart: entity.player2ReadyToStart,
        player1HasConfirmedFirstPlayer: entity.player1HasConfirmedFirstPlayer,
        player2HasConfirmedFirstPlayer: entity.player2HasConfirmedFirstPlayer,
        player1HasApprovedMatch: entity.player1HasApprovedMatch,
        player2HasApprovedMatch: entity.player2HasApprovedMatch,
        updatedAt: entity.updatedAt,
        startedAt: entity.startedAt,
        endedAt: entity.endedAt,
        winnerId: entity.winnerId,
        result: entity.result,
        winCondition: entity.winCondition,
        cancellationReason: entity.cancellationReason,
        gameState: entity.gameState,
      };

      // Type assertion needed because TypeORM's update() has strict typing for JSONB columns
      // The data is correct at runtime, but TypeScript can't verify nested JSON structures
      await this.matchEntityRepository.update(match.id, updateData as any);
      // Skip reload - return the domain entity directly since it already has correct updatedAt
      // This eliminates the SELECT query after UPDATE
      // The domain entity's updatedAt is already set correctly by domain logic
      return match;
    }

    // For new matches (no ID), use save() which will INSERT
    const saved = await this.matchEntityRepository.save(entity);
    return MatchOrmMapper.toDomain(saved);
  }

  /**
   * Delete a match by its ID
   */
  async delete(id: string): Promise<void> {
    await this.matchEntityRepository.delete(id);
  }

  /**
   * Check if a match exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.matchEntityRepository.count({
      where: { id },
    });
    return count > 0;
  }

  /**
   * Find active matches for a player
   */
  async findActiveMatchesByPlayer(playerId: string): Promise<Match[]> {
    const entities = await this.matchEntityRepository
      .createQueryBuilder('match')
      .where('(match.player1Id = :playerId OR match.player2Id = :playerId)', {
        playerId,
      })
      .andWhere('match.state != :endedState', {
        endedState: MatchState.MATCH_ENDED,
      })
      .andWhere('match.state != :cancelledState', {
        cancelledState: MatchState.CANCELLED,
      })
      .getMany();

    return entities.map((entity) => MatchOrmMapper.toDomain(entity));
  }
}
