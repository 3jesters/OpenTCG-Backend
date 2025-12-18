import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Card } from '../../domain/entities';
import { ICardRepository } from '../../domain/repositories';
import { CardOrmEntity } from './entities';
import { CardOrmMapper } from './mappers/card-orm.mapper';

/**
 * TypeORM Card Repository
 * PostgreSQL implementation of ICardRepository with bulk insert support
 */
@Injectable()
export class TypeOrmCardRepository implements ICardRepository {
  constructor(
    @InjectRepository(CardOrmEntity)
    private readonly cardEntityRepository: Repository<CardOrmEntity>,
  ) {}

  async findById(instanceId: string): Promise<Card | null> {
    const entity = await this.cardEntityRepository.findOne({
      where: { instanceId },
    });
    return entity ? CardOrmMapper.toDomain(entity) : null;
  }

  async findByCardId(cardId: string): Promise<Card | null> {
    const entity = await this.cardEntityRepository.findOne({
      where: { cardId },
    });
    return entity ? CardOrmMapper.toDomain(entity) : null;
  }

  async findBySetNameAndCardNumber(
    setName: string,
    cardNumber: string,
  ): Promise<Card | null> {
    const entity = await this.cardEntityRepository.findOne({
      where: { setName, cardNumber },
    });
    return entity ? CardOrmMapper.toDomain(entity) : null;
  }

  async findBySetName(setName: string): Promise<Card[]> {
    const entities = await this.cardEntityRepository.find({
      where: { setName },
      order: { cardNumber: 'ASC' },
    });
    return entities.map(CardOrmMapper.toDomain);
  }

  async getDistinctSetNames(): Promise<string[]> {
    const result = await this.cardEntityRepository
      .createQueryBuilder('card')
      .select('DISTINCT card.setName', 'setName')
      .getRawMany();
    return result.map((r) => r.setName);
  }

  async findAll(): Promise<Card[]> {
    const entities = await this.cardEntityRepository.find();
    return entities.map(CardOrmMapper.toDomain);
  }

  async save(card: Card): Promise<Card> {
    const entity = CardOrmMapper.toOrm(card);
    const saved = await this.cardEntityRepository.save(entity);
    return CardOrmMapper.toDomain(saved);
  }

  async saveMany(cards: Card[]): Promise<Card[]> {
    if (cards.length === 0) {
      return [];
    }

    // Convert all cards to ORM entities
    const entities = cards.map(CardOrmMapper.toOrm);

    // Bulk insert using TypeORM's save method
    // This is optimized for bulk operations
    const saved = await this.cardEntityRepository.save(entities, {
      chunk: 100, // Insert in chunks of 100 for better performance
    });

    return saved.map(CardOrmMapper.toDomain);
  }

  async delete(instanceId: string): Promise<void> {
    await this.cardEntityRepository.delete(instanceId);
  }

  async exists(instanceId: string): Promise<boolean> {
    const count = await this.cardEntityRepository.count({
      where: { instanceId },
    });
    return count > 0;
  }
}

