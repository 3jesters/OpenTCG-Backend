import { Injectable } from '@nestjs/common';
import { GetCardByIdUseCase } from '../../../card/application/use-cases/get-card-by-id.use-case';
import {
  StartGameRules,
  StartGameRuleType,
} from '../../../tournament/domain/value-objects';
import { CardType, EvolutionStage } from '../../../card/domain/enums';

/**
 * Start Game Rules Validator Service
 * Validates if a player's hand satisfies all start game rules
 */
@Injectable()
export class StartGameRulesValidatorService {
  constructor(private readonly getCardByIdUseCase: GetCardByIdUseCase) {}

  /**
   * Validate if a hand satisfies all start game rules
   * @param hand Array of card IDs in the hand
   * @param rules Start game rules to validate against
   * @returns true if all rules are satisfied, false otherwise
   */
  async validateHand(
    hand: string[],
    rules: StartGameRules,
  ): Promise<boolean> {
    // If no rules, hand is always valid
    if (rules.isEmpty()) {
      return true;
    }

    // Check each rule
    for (const rule of rules.rules) {
      const satisfied = await this.validateRule(hand, rule);
      if (!satisfied) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate a single rule against the hand
   */
  private async validateRule(
    hand: string[],
    rule: { type: StartGameRuleType; minCount: number },
  ): Promise<boolean> {
    switch (rule.type) {
      case StartGameRuleType.HAS_BASIC_POKEMON:
        return await this.validateBasicPokemon(hand, rule.minCount);
      case StartGameRuleType.HAS_ENERGY_CARD:
        return await this.validateEnergyCard(hand, rule.minCount);
      default:
        // Unknown rule type - fail validation to be safe
        return false;
    }
  }

  /**
   * Count Basic Pokemon cards in hand
   */
  private async validateBasicPokemon(
    hand: string[],
    minCount: number,
  ): Promise<boolean> {
    let count = 0;

    for (const cardId of hand) {
      try {
        const card = await this.getCardByIdUseCase.execute(cardId);
        if (
          card.cardType === CardType.POKEMON &&
          card.stage === EvolutionStage.BASIC
        ) {
          count++;
        }
      } catch (error) {
        // If card not found, skip it (shouldn't happen in normal flow)
        console.warn(`Card not found: ${cardId}`);
        continue;
      }
    }

    return count >= minCount;
  }

  /**
   * Count Energy cards in hand
   */
  private async validateEnergyCard(
    hand: string[],
    minCount: number,
  ): Promise<boolean> {
    let count = 0;

    for (const cardId of hand) {
      try {
        const card = await this.getCardByIdUseCase.execute(cardId);
        if (card.cardType === CardType.ENERGY) {
          count++;
        }
      } catch (error) {
        // If card not found, skip it (shouldn't happen in normal flow)
        console.warn(`Card not found: ${cardId}`);
        continue;
      }
    }

    return count >= minCount;
  }
}

