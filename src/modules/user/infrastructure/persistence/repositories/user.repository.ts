import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../domain/entities/user.entity';
import { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { UserOrmEntity } from '../entities/user.orm-entity';
import { UserMapper } from '../mappers/user.mapper';

/**
 * TypeORM User Repository
 * PostgreSQL implementation of IUserRepository
 */
@Injectable()
export class TypeOrmUserRepository implements IUserRepository {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly userEntityRepository: Repository<UserOrmEntity>,
  ) {}

  async findById(id: string): Promise<User | null> {
    const entity = await this.userEntityRepository.findOne({
      where: { id },
    });
    return entity ? UserMapper.toDomain(entity) : null;
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    const entity = await this.userEntityRepository.findOne({
      where: { googleId },
    });
    return entity ? UserMapper.toDomain(entity) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const entity = await this.userEntityRepository.findOne({
      where: { email },
    });
    return entity ? UserMapper.toDomain(entity) : null;
  }

  async save(user: User): Promise<User> {
    const entity = UserMapper.toOrm(user);
    const saved = await this.userEntityRepository.save(entity);
    return UserMapper.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await this.userEntityRepository.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.userEntityRepository.count({ where: { id } });
    return count > 0;
  }
}
