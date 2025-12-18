import { Set } from '../../../domain/entities';
import { SetOrmEntity } from '../entities';

/**
 * Set ORM Mapper
 * Converts between SetOrmEntity and Set domain entity
 */
export class SetOrmMapper {
  static toDomain(ormEntity: SetOrmEntity): Set {
    const set = new Set(
      ormEntity.id,
      ormEntity.name,
      ormEntity.series,
      ormEntity.releaseDate,
      ormEntity.totalCards,
    );

    if (ormEntity.description) {
      set.setDescription(ormEntity.description);
    }

    set.setOfficial(ormEntity.official);

    if (ormEntity.symbolUrl) {
      set.setSymbolUrl(ormEntity.symbolUrl);
    }

    if (ormEntity.logoUrl) {
      set.setLogoUrl(ormEntity.logoUrl);
    }

    return set;
  }

  static toOrm(domainEntity: Set): SetOrmEntity {
    const ormEntity = new SetOrmEntity();

    ormEntity.id = domainEntity.id;
    ormEntity.name = domainEntity.name;
    ormEntity.series = domainEntity.series;
    ormEntity.releaseDate = domainEntity.releaseDate;
    ormEntity.totalCards = domainEntity.totalCards;
    ormEntity.description = domainEntity.description || null;
    ormEntity.official = domainEntity.official;
    ormEntity.symbolUrl = domainEntity.symbolUrl || null;
    ormEntity.logoUrl = domainEntity.logoUrl || null;

    return ormEntity;
  }
}

