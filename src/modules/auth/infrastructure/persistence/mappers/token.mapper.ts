import { RefreshToken } from '../../../domain/entities/token.entity';
import { RefreshTokenOrmEntity } from '../entities/token.orm-entity';

/**
 * Token ORM Mapper
 * Converts between RefreshTokenOrmEntity and RefreshToken domain entity
 */
export class TokenMapper {
  static toDomain(ormEntity: RefreshTokenOrmEntity): RefreshToken {
    return new RefreshToken(
      ormEntity.id,
      ormEntity.userId,
      ormEntity.token,
      ormEntity.expiresAt,
      ormEntity.createdAt,
    );
  }

  static toOrm(domain: RefreshToken): RefreshTokenOrmEntity {
    const ormEntity = new RefreshTokenOrmEntity();
    ormEntity.id = domain.id;
    ormEntity.userId = domain.userId;
    ormEntity.token = domain.token;
    ormEntity.expiresAt = domain.expiresAt;
    ormEntity.createdAt = domain.createdAt;
    return ormEntity;
  }
}
