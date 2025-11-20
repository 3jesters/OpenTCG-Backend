import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ValidationResult } from '../../domain';
import { IDeckRepository } from '../../domain/repositories';
import { ITournamentRepository } from '../../../tournament/domain';

/**
 * Validate Deck Against Tournament Use Case
 * Performs full validation of a deck against tournament rules
 */
@Injectable()
export class ValidateDeckAgainstTournamentUseCase {
  constructor(
    @Inject(IDeckRepository)
    private readonly deckRepository: IDeckRepository,
    @Inject(ITournamentRepository)
    private readonly tournamentRepository: ITournamentRepository,
  ) {}

  async execute(deckId: string, tournamentId: string): Promise<ValidationResult> {
    // Load deck
    const deck = await this.deckRepository.findById(deckId);
    if (!deck) {
      throw new NotFoundException(`Deck with ID ${deckId} not found`);
    }

    // Load tournament
    const tournament = await this.tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new NotFoundException(`Tournament with ID ${tournamentId} not found`);
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Get tournament rules
    const deckRules = tournament.deckRules;
    const bannedSets = tournament.bannedSets;
    const setBannedCards = tournament.setBannedCards;

    // 1. Check deck size
    const totalCards = deck.getTotalCardCount();
    if (deckRules.exactDeckSize) {
      if (totalCards !== deckRules.minDeckSize) {
        errors.push(
          `Deck must have exactly ${deckRules.minDeckSize} cards but has ${totalCards}`,
        );
      }
    } else {
      if (totalCards < deckRules.minDeckSize) {
        errors.push(
          `Deck must have at least ${deckRules.minDeckSize} cards but has ${totalCards}`,
        );
      }
      if (totalCards > deckRules.maxDeckSize) {
        errors.push(
          `Deck cannot have more than ${deckRules.maxDeckSize} cards but has ${totalCards}`,
        );
      }
    }

    // 2. Check banned sets
    const deckSets = deck.getUniqueSets();
    for (const setName of deckSets) {
      if (bannedSets.includes(setName)) {
        errors.push(`Set "${setName}" is banned in this tournament`);
      }
    }

    // 3. Check card copies and banned cards
    for (const deckCard of deck.cards) {
      // Check if card is from a banned set (redundant with above, but catches specific cards)
      if (bannedSets.includes(deckCard.setName)) {
        errors.push(
          `Card ${deckCard.cardId} is from banned set "${deckCard.setName}"`,
        );
      }

      // Check if specific card is banned in its set
      const bannedCardsInSet = setBannedCards[deckCard.setName] || [];
      if (bannedCardsInSet.includes(deckCard.cardId)) {
        errors.push(
          `Card ${deckCard.cardId} is banned in this tournament`,
        );
      }

      // Check card quantity limits
      // Basic energy cards are exempt from copy limits in Pokemon TCG
      const isBasicEnergy = deckCard.cardId.includes('-energy--');
      const maxCopies = deckRules.getMaxCopiesForCard(
        deckCard.setName,
        deckCard.cardId,
      );
      
      if (!isBasicEnergy) {
        if (deckCard.quantity > maxCopies) {
          errors.push(
            `Card ${deckCard.cardId} has ${deckCard.quantity} copies but maximum allowed is ${maxCopies}`,
          );
        }
      }

      // Warn about restricted cards
      if (deckRules.isCardRestricted(deckCard.setName, deckCard.cardId)) {
        warnings.push(
          `Card ${deckCard.cardId} is restricted to ${maxCopies} copies in this tournament`,
        );
      }
    }

    // 4. Check minimum basic Pokemon
    // Note: This is a simplified check. For full validation, we would need to load
    // actual card data to check card types and evolution stages.
    // For now, we'll add a warning if we can't verify this requirement.
    if (deckRules.minBasicPokemon > 0) {
      warnings.push(
        `Deck validation cannot verify minimum basic Pokemon requirement (${deckRules.minBasicPokemon}) without full card data. Please ensure your deck meets this requirement.`,
      );
    }

    // Update deck validation status
    const isValid = errors.length === 0;
    deck.setValid(isValid);
    await this.deckRepository.save(deck);

    // Return validation result
    if (errors.length > 0 && warnings.length > 0) {
      return ValidationResult.failureWithWarnings(errors, warnings);
    } else if (errors.length > 0) {
      return ValidationResult.failure(errors);
    } else if (warnings.length > 0) {
      return ValidationResult.withWarnings(warnings);
    } else {
      return ValidationResult.success();
    }
  }
}

