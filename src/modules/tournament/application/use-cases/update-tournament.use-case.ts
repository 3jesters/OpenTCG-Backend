import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Tournament, ITournamentRepository, DeckRules, RestrictedCard } from '../../domain';
import { UpdateTournamentDto } from '../dto/update-tournament.dto';

/**
 * Update Tournament Use Case
 * Handles the business logic for updating an existing tournament
 */
@Injectable()
export class UpdateTournamentUseCase {
  constructor(
    @Inject(ITournamentRepository)
    private readonly tournamentRepository: ITournamentRepository,
  ) {}

  async execute(id: string, dto: UpdateTournamentDto): Promise<Tournament> {
    // Find existing tournament
    const tournament = await this.tournamentRepository.findById(id);
    if (!tournament) {
      throw new NotFoundException(`Tournament with ID '${id}' not found`);
    }

    // Update basic fields
    if (dto.name !== undefined) {
      tournament.setName(dto.name);
    }
    if (dto.version !== undefined) {
      tournament.setVersion(dto.version);
    }
    if (dto.description !== undefined) {
      tournament.setDescription(dto.description);
    }
    if (dto.author !== undefined) {
      tournament.setAuthor(dto.author);
    }
    if (dto.official !== undefined) {
      tournament.setOfficial(dto.official);
    }
    if (dto.status !== undefined) {
      tournament.setStatus(dto.status);
    }

    // Update deck rules if provided
    if (dto.deckRules) {
      const restrictedCards = (dto.deckRules.restrictedCards || []).map(
        (rc) => new RestrictedCard(rc.setName, rc.cardId, rc.maxCopies),
      );

      const deckRules = new DeckRules(
        dto.deckRules.minDeckSize,
        dto.deckRules.maxDeckSize,
        dto.deckRules.exactDeckSize,
        dto.deckRules.maxCopiesPerCard,
        dto.deckRules.minBasicPokemon,
        restrictedCards,
      );

      tournament.updateDeckRules(deckRules);
    }

    // Update banned sets if provided (replaces existing)
    if (dto.bannedSets !== undefined) {
      // Clear existing banned sets
      tournament.bannedSets.forEach((setName) => tournament.unbanSet(setName));
      // Add new banned sets
      dto.bannedSets.forEach((setName) => tournament.banSet(setName));
    }

    // Update set banned cards if provided (replaces existing)
    if (dto.setBannedCards !== undefined) {
      // Clear existing banned cards
      Object.keys(tournament.setBannedCards).forEach((setName) => {
        tournament.setBannedCards[setName].forEach((cardId) => {
          tournament.unbanCardInSet(setName, cardId);
        });
      });
      // Add new banned cards
      Object.entries(dto.setBannedCards).forEach(([setName, cardIds]) => {
        cardIds.forEach((cardId) => tournament.banCardInSet(setName, cardId));
      });
    }

    // Update saved decks if provided (replaces existing)
    if (dto.savedDecks !== undefined) {
      // Clear existing saved decks
      tournament.savedDecks.forEach((deckId) => tournament.removeSavedDeck(deckId));
      // Add new saved decks
      dto.savedDecks.forEach((deckId) => tournament.addSavedDeck(deckId));
    }

    // Update optional metadata
    if (dto.startDate !== undefined) {
      tournament.setStartDate(new Date(dto.startDate));
    }
    if (dto.endDate !== undefined) {
      tournament.setEndDate(new Date(dto.endDate));
    }
    if (dto.maxParticipants !== undefined) {
      tournament.setMaxParticipants(dto.maxParticipants);
    }
    if (dto.format !== undefined) {
      tournament.setFormat(dto.format);
    }

    // Update regulation marks if provided (replaces existing)
    if (dto.regulationMarks !== undefined) {
      // Clear existing marks
      tournament.regulationMarks.forEach((mark) => tournament.removeRegulationMark(mark));
      // Add new marks
      dto.regulationMarks.forEach((mark) => tournament.addRegulationMark(mark));
    }

    // Save updated tournament
    return await this.tournamentRepository.save(tournament);
  }
}

