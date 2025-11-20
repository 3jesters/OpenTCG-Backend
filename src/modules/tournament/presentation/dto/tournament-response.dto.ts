import { Tournament, TournamentStatus } from '../../domain';

/**
 * Restricted Card Response DTO
 */
export class RestrictedCardResponseDto {
  setName: string;
  cardId: string;
  maxCopies: number;

  constructor(setName: string, cardId: string, maxCopies: number) {
    this.setName = setName;
    this.cardId = cardId;
    this.maxCopies = maxCopies;
  }
}

/**
 * Deck Rules Response DTO
 */
export class DeckRulesResponseDto {
  minDeckSize: number;
  maxDeckSize: number;
  exactDeckSize: boolean;
  maxCopiesPerCard: number;
  minBasicPokemon: number;
  restrictedCards: RestrictedCardResponseDto[];

  static fromDomain(deckRules: any): DeckRulesResponseDto {
    return {
      minDeckSize: deckRules.minDeckSize,
      maxDeckSize: deckRules.maxDeckSize,
      exactDeckSize: deckRules.exactDeckSize,
      maxCopiesPerCard: deckRules.maxCopiesPerCard,
      minBasicPokemon: deckRules.minBasicPokemon,
      restrictedCards: deckRules.restrictedCards.map(
        (rc: any) => new RestrictedCardResponseDto(rc.setName, rc.cardId, rc.maxCopies),
      ),
    };
  }
}

/**
 * Tournament Response DTO
 * Maps Tournament entity to HTTP response
 */
export class TournamentResponseDto {
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
  deckRules: DeckRulesResponseDto;
  savedDecks: string[];
  startDate?: string;
  endDate?: string;
  maxParticipants?: number;
  format?: string;
  regulationMarks: string[];

  static fromDomain(tournament: Tournament): TournamentResponseDto {
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
      deckRules: DeckRulesResponseDto.fromDomain(tournament.deckRules),
      savedDecks: tournament.savedDecks,
      startDate: tournament.startDate?.toISOString(),
      endDate: tournament.endDate?.toISOString(),
      maxParticipants: tournament.maxParticipants,
      format: tournament.format,
      regulationMarks: tournament.regulationMarks,
    };
  }
}

