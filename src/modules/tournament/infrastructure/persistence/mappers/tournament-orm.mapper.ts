import { Tournament } from '../../../domain/entities';
import { TournamentOrmEntity } from '../entities';
import {
  DeckRules,
  RestrictedCard,
  StartGameRules,
  StartGameRule,
  StartGameRuleType,
} from '../../../domain/value-objects';

/**
 * Tournament ORM Mapper
 * Converts between TournamentOrmEntity and Tournament domain entity
 */
export class TournamentOrmMapper {
  static toDomain(ormEntity: TournamentOrmEntity): Tournament {
    // Reconstruct RestrictedCard value objects
    const restrictedCards = ormEntity.deckRules.restrictedCards.map(
      (rc) => new RestrictedCard(rc.setName, rc.cardId, rc.maxCopies),
    );

    // Reconstruct DeckRules value object
    const deckRules = new DeckRules(
      ormEntity.deckRules.minDeckSize,
      ormEntity.deckRules.maxDeckSize,
      ormEntity.deckRules.exactDeckSize,
      ormEntity.deckRules.maxCopiesPerCard,
      ormEntity.deckRules.minBasicPokemon,
      restrictedCards,
    );

    // Reconstruct StartGameRules value object
    // Cast JSONB rules to proper StartGameRule objects
    const rules: StartGameRule[] = ormEntity.startGameRules.rules.map(
      (rule: any) => ({
        type: rule.type as StartGameRuleType,
        minCount: rule.minCount,
      }),
    );
    const startGameRules = new StartGameRules(rules);

    // Create Tournament domain entity
    const tournament = new Tournament(
      ormEntity.id,
      ormEntity.name,
      ormEntity.version,
      ormEntity.description,
      ormEntity.author,
      deckRules,
      ormEntity.createdAt,
    );

    // Set all additional fields
    tournament.setOfficial(ormEntity.official);
    tournament.setStatus(ormEntity.status);
    tournament.setStartGameRules(startGameRules);

    if (ormEntity.startDate) {
      tournament.setStartDate(ormEntity.startDate);
    }

    if (ormEntity.endDate) {
      tournament.setEndDate(ormEntity.endDate);
    }

    if (ormEntity.maxParticipants) {
      tournament.setMaxParticipants(ormEntity.maxParticipants);
    }

    if (ormEntity.format) {
      tournament.setFormat(ormEntity.format);
    }

    tournament.setPrizeCardCount(ormEntity.prizeCardCount);

    // Set arrays
    ormEntity.bannedSets.forEach((setName) => {
      if (setName) tournament.banSet(setName);
    });

    ormEntity.savedDecks.forEach((deckId) => {
      if (deckId) tournament.addSavedDeck(deckId);
    });

    ormEntity.regulationMarks.forEach((mark) => {
      if (mark) tournament.addRegulationMark(mark);
    });

    // Set banned cards per set
    Object.entries(ormEntity.setBannedCards).forEach(([setName, cardIds]) => {
      cardIds.forEach((cardId) => {
        tournament.banCardInSet(setName, cardId);
      });
    });

    return tournament;
  }

  static toOrm(domainEntity: Tournament): TournamentOrmEntity {
    const ormEntity = new TournamentOrmEntity();

    ormEntity.id = domainEntity.id;
    ormEntity.name = domainEntity.name;
    ormEntity.version = domainEntity.version;
    ormEntity.description = domainEntity.description;
    ormEntity.author = domainEntity.author;
    ormEntity.createdAt = domainEntity.createdAt;
    ormEntity.updatedAt = domainEntity.updatedAt;
    ormEntity.official = domainEntity.official;
    ormEntity.status = domainEntity.status;
    ormEntity.bannedSets = domainEntity.bannedSets;
    ormEntity.setBannedCards = domainEntity.setBannedCards;
    ormEntity.savedDecks = domainEntity.savedDecks;
    ormEntity.startDate = domainEntity.startDate || null;
    ormEntity.endDate = domainEntity.endDate || null;
    ormEntity.maxParticipants = domainEntity.maxParticipants || null;
    ormEntity.format = domainEntity.format || null;
    ormEntity.regulationMarks = domainEntity.regulationMarks;
    ormEntity.prizeCardCount = domainEntity.prizeCardCount;

    // Map DeckRules value object to JSONB
    ormEntity.deckRules = {
      minDeckSize: domainEntity.deckRules.minDeckSize,
      maxDeckSize: domainEntity.deckRules.maxDeckSize,
      exactDeckSize: domainEntity.deckRules.exactDeckSize,
      maxCopiesPerCard: domainEntity.deckRules.maxCopiesPerCard,
      minBasicPokemon: domainEntity.deckRules.minBasicPokemon,
      restrictedCards: domainEntity.deckRules.restrictedCards.map((rc) => ({
        setName: rc.setName,
        cardId: rc.cardId,
        maxCopies: rc.maxCopies,
      })),
    };

    // Map StartGameRules value object to JSONB
    ormEntity.startGameRules = {
      rules: domainEntity.startGameRules.rules,
    };

    return ormEntity;
  }
}
