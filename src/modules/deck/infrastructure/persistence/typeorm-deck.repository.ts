import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deck, IDeckRepository } from '../../domain';
import { DeckOrmEntity } from './entities';
import { DeckOrmMapper } from './mappers/deck-orm.mapper';

/**
 * TypeORM Deck Repository
 * PostgreSQL implementation of IDeckRepository
 */
@Injectable()
export class TypeOrmDeckRepository implements IDeckRepository {
  constructor(
    @InjectRepository(DeckOrmEntity)
    private readonly deckEntityRepository: Repository<DeckOrmEntity>,
  ) {}

  async findById(id: string): Promise<Deck | null> {
    const entity = await this.deckEntityRepository.findOne({
      where: { id },
    });
    return entity ? DeckOrmMapper.toDomain(entity) : null;
  }

  async findAll(tournamentId?: string): Promise<Deck[]> {
    const where = tournamentId ? { tournamentId } : {};
    const entities = await this.deckEntityRepository.find({ where });
    return entities.map(DeckOrmMapper.toDomain);
  }

  async save(deck: Deck): Promise<Deck> {
    const entity = DeckOrmMapper.toOrm(deck);
    const saved = await this.deckEntityRepository.save(entity);
    return DeckOrmMapper.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await this.deckEntityRepository.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.deckEntityRepository.count({ where: { id } });
    return count > 0;
  }

  async findByCreator(createdBy: string): Promise<Deck[]> {
    const entities = await this.deckEntityRepository.find({
      where: { createdBy },
    });
    return entities.map(DeckOrmMapper.toDomain);
  }
}
