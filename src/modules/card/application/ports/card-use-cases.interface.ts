import { CardDetailDto } from '../../presentation/dto/card-detail.dto';
import { GetAvailableSetsResponseDto } from '../../presentation/dto/get-available-sets-response.dto';
import { GetCardsResponseDto } from '../../presentation/dto/get-cards-response.dto';
import { Card } from '../../domain/entities/card.entity';

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
  execute(): Promise<GetAvailableSetsResponseDto>;
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

