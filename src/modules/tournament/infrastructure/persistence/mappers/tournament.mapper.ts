import {
  Tournament,
  TournamentStatus,
  DeckRules,
  RestrictedCard,
  StartGameRules,
  StartGameRuleType,
} from '../../../domain';

/**
 * JSON structure for tournament persistence
 */
export interface TournamentJson {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  official: boolean;
  status: TournamentStatus;
  bannedSets: string[];
  setBannedCards: Record<string, string[]>;
  deckRules: {
    minDeckSize: number;
    maxDeckSize: number;
    exactDeckSize: boolean;
    maxCopiesPerCard: number;
    minBasicPokemon: number;
    restrictedCards: Array<{
      setName: string;
      cardId: string;
      maxCopies: number;
    }>;
  };
  savedDecks: string[];
  startGameRules: {
    rules: Array<{
      type: StartGameRuleType;
      minCount: number;
    }>;
  };
  startDate?: string;
  endDate?: string;
  maxParticipants?: number;
  format?: string;
  regulationMarks: string[];
  prizeCardCount?: number;
}

/**
 * Tournament Mapper
 * Maps between Tournament domain entity and JSON structure
 */
export class TournamentMapper {
  /**
   * Convert domain entity to JSON
   */
  static toJson(tournament: Tournament): TournamentJson {
    return {
      id: tournament.id,
      name: tournament.name,
      version: tournament.version,
      description: tournament.description,
      author: tournament.author,
      createdAt: tournament.createdAt.toISOString(),
      updatedAt: tournament.updatedAt.toISOString(),
      official: tournament.official,
      status: tournament.status,
      bannedSets: tournament.bannedSets,
      setBannedCards: tournament.setBannedCards,
      deckRules: {
        minDeckSize: tournament.deckRules.minDeckSize,
        maxDeckSize: tournament.deckRules.maxDeckSize,
        exactDeckSize: tournament.deckRules.exactDeckSize,
        maxCopiesPerCard: tournament.deckRules.maxCopiesPerCard,
        minBasicPokemon: tournament.deckRules.minBasicPokemon,
        restrictedCards: tournament.deckRules.restrictedCards.map((rc) => ({
          setName: rc.setName,
          cardId: rc.cardId,
          maxCopies: rc.maxCopies,
        })),
      },
      savedDecks: tournament.savedDecks,
      startGameRules: {
        rules: tournament.startGameRules.rules.map((rule) => ({
          type: rule.type,
          minCount: rule.minCount,
        })),
      },
      startDate: tournament.startDate?.toISOString(),
      endDate: tournament.endDate?.toISOString(),
      maxParticipants: tournament.maxParticipants,
      format: tournament.format,
      regulationMarks: tournament.regulationMarks,
      prizeCardCount: tournament.prizeCardCount,
    };
  }

  /**
   * Convert JSON to domain entity
   */
  static toDomain(json: TournamentJson): Tournament {
    // Create restricted cards
    const restrictedCards = json.deckRules.restrictedCards.map(
      (rc) => new RestrictedCard(rc.setName, rc.cardId, rc.maxCopies),
    );

    // Create deck rules
    const deckRules = new DeckRules(
      json.deckRules.minDeckSize,
      json.deckRules.maxDeckSize,
      json.deckRules.exactDeckSize,
      json.deckRules.maxCopiesPerCard,
      json.deckRules.minBasicPokemon,
      restrictedCards,
    );

    // Create tournament
    const tournament = new Tournament(
      json.id,
      json.name,
      json.version,
      json.description,
      json.author,
      deckRules,
      new Date(json.createdAt),
    );

    // Set optional fields
    tournament.setOfficial(json.official);
    tournament.setStatus(json.status);

    // Set banned sets
    json.bannedSets.forEach((setName) => tournament.banSet(setName));

    // Set banned cards per set
    Object.entries(json.setBannedCards).forEach(([setName, cardIds]) => {
      cardIds.forEach((cardId) => tournament.banCardInSet(setName, cardId));
    });

    // Set saved decks
    json.savedDecks.forEach((deckId) => tournament.addSavedDeck(deckId));

    // Set start game rules
    if (json.startGameRules) {
      const startGameRules = new StartGameRules(json.startGameRules.rules);
      tournament.setStartGameRules(startGameRules);
    }

    // Set optional metadata
    if (json.startDate) {
      tournament.setStartDate(new Date(json.startDate));
    }
    if (json.endDate) {
      tournament.setEndDate(new Date(json.endDate));
    }
    if (json.maxParticipants) {
      tournament.setMaxParticipants(json.maxParticipants);
    }
    if (json.format) {
      tournament.setFormat(json.format);
    }

    // Set regulation marks
    json.regulationMarks.forEach((mark) => tournament.addRegulationMark(mark));

    // Set prize card count
    if (json.prizeCardCount !== undefined) {
      tournament.setPrizeCardCount(json.prizeCardCount);
    }

    return tournament;
  }
}
