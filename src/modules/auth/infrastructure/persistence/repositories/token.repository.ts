import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { RefreshToken } from '../../../domain/entities/token.entity';
import { ITokenRepository } from '../../../domain/repositories/token.repository.interface';
import { RefreshTokenOrmEntity } from '../entities/token.orm-entity';
import { TokenMapper } from '../mappers/token.mapper';

/**
 * TypeORM Token Repository
 * PostgreSQL implementation of ITokenRepository
 */
@Injectable()
export class TypeOrmTokenRepository implements ITokenRepository {
  constructor(
    @InjectRepository(RefreshTokenOrmEntity)
    private readonly tokenEntityRepository: Repository<RefreshTokenOrmEntity>,
  ) {}

  async findByToken(token: string): Promise<RefreshToken | null> {
    const entity = await this.tokenEntityRepository.findOne({
      where: { token },
    });
    return entity ? TokenMapper.toDomain(entity) : null;
  }

  async findByUserId(userId: string): Promise<RefreshToken | null> {
    const entity = await this.tokenEntityRepository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return entity ? TokenMapper.toDomain(entity) : null;
  }

  async save(token: RefreshToken): Promise<RefreshToken> {
    const entity = TokenMapper.toOrm(token);
    const saved = await this.tokenEntityRepository.save(entity);
    return TokenMapper.toDomain(saved);
  }

  async deleteByToken(token: string): Promise<void> {
    await this.tokenEntityRepository.delete({ token });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.tokenEntityRepository.delete({ userId });
  }

  async deleteExpired(): Promise<number> {
    const result = await this.tokenEntityRepository.delete({
      expiresAt: LessThan(new Date()),
    });
    return result.affected || 0;
  }
}
