import { Injectable, Inject, ConflictException } from '@nestjs/common';
import { Tournament, ITournamentRepository, DeckRules, RestrictedCard } from '../../domain';
import { CreateTournamentDto } from '../dto/create-tournament.dto';

/**
 * Create Tournament Use Case
 * Handles the business logic for creating a new tournament
 */
@Injectable()
export class CreateTournamentUseCase {
  constructor(
    @Inject(ITournamentRepository)
    private readonly tournamentRepository: ITournamentRepository,
  ) {}

  async execute(dto: CreateTournamentDto): Promise<Tournament> {
    // Check if tournament with this ID already exists
    const existing = await this.tournamentRepository.findById(dto.id);
    if (existing) {
      throw new ConflictException(`Tournament with ID '${dto.id}' already exists`);
    }

    // Create restricted cards
    const restrictedCards = (dto.deckRules.restrictedCards || []).map(
      (rc) => new RestrictedCard(rc.setName, rc.cardId, rc.maxCopies),
    );

    // Create deck rules
    const deckRules = new DeckRules(
      dto.deckRules.minDeckSize,
      dto.deckRules.maxDeckSize,
      dto.deckRules.exactDeckSize,
      dto.deckRules.maxCopiesPerCard,
      dto.deckRules.minBasicPokemon,
      restrictedCards,
    );

    // Create tournament
    const tournament = Tournament.create(
      dto.id,
      dto.name,
      dto.version,
      dto.description,
      dto.author,
      deckRules,
    );

    // Set optional fields
    if (dto.official !== undefined) {
      tournament.setOfficial(dto.official);
    }
    if (dto.status !== undefined) {
      tournament.setStatus(dto.status);
    }

    // Set banned sets
    if (dto.bannedSets) {
      dto.bannedSets.forEach((setName) => tournament.banSet(setName));
    }

    // Set banned cards per set
    if (dto.setBannedCards) {
      Object.entries(dto.setBannedCards).forEach(([setName, cardIds]) => {
        cardIds.forEach((cardId) => tournament.banCardInSet(setName, cardId));
      });
    }

    // Set saved decks
    if (dto.savedDecks) {
      dto.savedDecks.forEach((deckId) => tournament.addSavedDeck(deckId));
    }

    // Set optional metadata
    if (dto.startDate) {
      tournament.setStartDate(new Date(dto.startDate));
    }
    if (dto.endDate) {
      tournament.setEndDate(new Date(dto.endDate));
    }
    if (dto.maxParticipants) {
      tournament.setMaxParticipants(dto.maxParticipants);
    }
    if (dto.format) {
      tournament.setFormat(dto.format);
    }

    // Set regulation marks
    if (dto.regulationMarks) {
      dto.regulationMarks.forEach((mark) => tournament.addRegulationMark(mark));
    }

    // Save tournament
    return await this.tournamentRepository.save(tournament);
  }
}

