import { CardDetailDto } from '../../presentation/dto/card-detail.dto';
import { GetAvailableSetsResponseDto } from '../../presentation/dto/get-available-sets-response.dto';
import { GetCardsResponseDto } from '../../presentation/dto/get-cards-response.dto';
import { Card } from '../../domain/entities/card.entity';
import { CardStrengthResult } from '../../domain/services/card-strength-calculator.service';
import { CardEditorResponseDto } from '../../presentation/dto/card-editor-response.dto';
import { CreateCardRequestDto } from '../dto/create-card-request.dto';
import { SearchCardsResponseDto } from '../../presentation/dto/search-cards-response.dto';
import { SearchCardsRequestDto } from '../../presentation/dto/search-cards-request.dto';

/**
 * Get Card By ID Use Case Interface
 */
export interface IGetCardByIdUseCase {
  execute(cardId: string): Promise<CardDetailDto>;
  getCardEntity(cardId: string): Promise<Card>;
  getCardsByIds(cardIds: string[]): Promise<Map<string, Card>>;
}

export const IGetCardByIdUseCase = Symbol('IGetCardByIdUseCase');

/**
 * Get Available Sets Use Case Interface
 */
export interface IGetAvailableSetsUseCase {
  execute(author?: string, official?: boolean): Promise<GetAvailableSetsResponseDto>;
}

export const IGetAvailableSetsUseCase = Symbol('IGetAvailableSetsUseCase');

/**
 * Preview Card Use Case Interface
 */
export interface IPreviewCardUseCase {
  execute(
    author: string,
    setName: string,
    version: string,
    cardNumber: string,
  ): Promise<CardDetailDto>;
  getCardEntity(
    author: string,
    setName: string,
    version: string,
    cardNumber: string,
  ): Promise<Card>;
}

export const IPreviewCardUseCase = Symbol('IPreviewCardUseCase');

/**
 * Preview Set Use Case Interface
 */
export interface IPreviewSetUseCase {
  execute(
    author: string,
    setName: string,
    version: string,
  ): Promise<GetCardsResponseDto>;
}

export const IPreviewSetUseCase = Symbol('IPreviewSetUseCase');

/**
 * Calculate Card Strength Use Case Interface
 */
export interface ICalculateCardStrengthUseCase {
  execute(cardId: string): Promise<CardStrengthResult>;
  executeForCard(card: Card): CardStrengthResult;
}

export const ICalculateCardStrengthUseCase = Symbol('ICalculateCardStrengthUseCase');

/**
 * Create Card Use Case Interface
 */
export interface ICreateCardUseCase {
  execute(dto: CreateCardRequestDto): Promise<CardEditorResponseDto>;
}

export const ICreateCardUseCase = Symbol('ICreateCardUseCase');

/**
 * Search Cards Use Case Interface
 */
export interface ISearchCardsUseCase {
  execute(dto: SearchCardsRequestDto): Promise<SearchCardsResponseDto>;
}

export const ISearchCardsUseCase = Symbol('ISearchCardsUseCase');

