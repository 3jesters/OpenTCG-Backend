import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Set } from '../../domain/entities';
import { ISetRepository } from '../../domain/repositories';
import { SetOrmEntity } from './entities';
import { SetOrmMapper } from './mappers/set-orm.mapper';

/**
 * TypeORM Set Repository
 * PostgreSQL implementation of ISetRepository
 */
@Injectable()
export class TypeOrmSetRepository implements ISetRepository {
  constructor(
    @InjectRepository(SetOrmEntity)
    private readonly setEntityRepository: Repository<SetOrmEntity>,
  ) {}

  async findById(id: string): Promise<Set | null> {
    const entity = await this.setEntityRepository.findOne({
      where: { id },
    });
    return entity ? SetOrmMapper.toDomain(entity) : null;
  }

  async findAll(): Promise<Set[]> {
    const entities = await this.setEntityRepository.find();
    return entities.map(SetOrmMapper.toDomain);
  }

  async save(set: Set): Promise<Set> {
    const entity = SetOrmMapper.toOrm(set);
    const saved = await this.setEntityRepository.save(entity);
    return SetOrmMapper.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await this.setEntityRepository.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.setEntityRepository.count({ where: { id } });
    return count > 0;
  }

  async findByOwnerId(ownerId: string): Promise<Set[]> {
    const entities = await this.setEntityRepository.find({
      where: { ownerId },
    });
    return entities.map(SetOrmMapper.toDomain);
  }

  async findGlobalSets(): Promise<Set[]> {
    const entities = await this.setEntityRepository.find({
      where: { ownerId: 'system' },
    });
    return entities.map(SetOrmMapper.toDomain);
  }

  async findAccessibleSets(userId: string): Promise<Set[]> {
    const entities = await this.setEntityRepository.find({
      where: [{ ownerId: 'system' }, { ownerId: userId }],
    });
    return entities.map(SetOrmMapper.toDomain);
  }
}
