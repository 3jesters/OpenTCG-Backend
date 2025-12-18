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
      queryBuilder.where('match.tournamentId = :tournamentId', { tournamentId });
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
   */
  async save(match: Match): Promise<Match> {
    const entity = MatchOrmMapper.toOrm(match);
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
      .where(
        '(match.player1Id = :playerId OR match.player2Id = :playerId)',
        { playerId },
      )
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

