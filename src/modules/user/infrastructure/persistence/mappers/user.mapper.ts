import { User } from '../../../domain/entities/user.entity';
import { UserOrmEntity } from '../entities/user.orm-entity';

/**
 * User ORM Mapper
 * Converts between UserOrmEntity and User domain entity
 */
export class UserMapper {
  static toDomain(ormEntity: UserOrmEntity): User {
    return new User(
      ormEntity.id,
      ormEntity.googleId,
      ormEntity.email,
      ormEntity.name,
      ormEntity.createdAt,
      ormEntity.updatedAt,
      ormEntity.picture || undefined,
    );
  }

  static toOrm(domain: User): UserOrmEntity {
    const ormEntity = new UserOrmEntity();
    ormEntity.id = domain.id;
    ormEntity.googleId = domain.googleId;
    ormEntity.email = domain.email;
    ormEntity.name = domain.name;
    ormEntity.picture = domain.picture || null;
    ormEntity.createdAt = domain.createdAt;
    ormEntity.updatedAt = domain.updatedAt;
    return ormEntity;
  }
}
