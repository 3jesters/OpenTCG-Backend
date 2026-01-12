import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { CardStrengthCalculatorService } from '../../domain/services/card-strength-calculator.service';
import { CardStrengthResult } from '../../domain/services/card-strength-calculator.service';
import {
  IGetCardByIdUseCase,
  ICalculateCardStrengthUseCase,
} from '../ports/card-use-cases.interface';
import { Card } from '../../domain/entities/card.entity';

/**
 * Calculate Card Strength Use Case
 * Calculates balance/strength score for a card
 */
@Injectable()
export class CalculateCardStrengthUseCase
  implements ICalculateCardStrengthUseCase
{
  constructor(
    private readonly cardStrengthCalculator: CardStrengthCalculatorService,
    @Inject(IGetCardByIdUseCase)
    private readonly getCardByIdUseCase: IGetCardByIdUseCase,
  ) {}

  /**
   * Calculate strength for a card by cardId
   */
  async execute(cardId: string): Promise<CardStrengthResult> {
    const card = await this.getCardByIdUseCase.getCardEntity(cardId);
    if (!card) {
      throw new NotFoundException(`Card with ID ${cardId} not found`);
    }
    return this.executeForCard(card);
  }

  /**
   * Calculate strength for a Card entity
   * Can be called directly when you already have the Card entity
   */
  executeForCard(card: Card): CardStrengthResult {
    return this.cardStrengthCalculator.calculateStrength(card);
  }
}
