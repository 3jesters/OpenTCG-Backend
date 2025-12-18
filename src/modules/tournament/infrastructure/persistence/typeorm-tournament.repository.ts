import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament, ITournamentRepository } from '../../domain';
import { TournamentOrmEntity } from './entities';
import { TournamentOrmMapper } from './mappers/tournament-orm.mapper';

/**
 * TypeORM Tournament Repository
 * PostgreSQL implementation of ITournamentRepository
 */
@Injectable()
export class TypeOrmTournamentRepository implements ITournamentRepository {
  constructor(
    @InjectRepository(TournamentOrmEntity)
    private readonly tournamentEntityRepository: Repository<TournamentOrmEntity>,
  ) {}

  async findAll(): Promise<Tournament[]> {
    const entities = await this.tournamentEntityRepository.find();
    return entities.map(TournamentOrmMapper.toDomain);
  }

  async findById(id: string): Promise<Tournament | null> {
    const entity = await this.tournamentEntityRepository.findOne({
      where: { id },
    });
    return entity ? TournamentOrmMapper.toDomain(entity) : null;
  }

  async save(tournament: Tournament): Promise<Tournament> {
    const entity = TournamentOrmMapper.toOrm(tournament);
    const saved = await this.tournamentEntityRepository.save(entity);
    return TournamentOrmMapper.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await this.tournamentEntityRepository.delete(id);
  }
}

