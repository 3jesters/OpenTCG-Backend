import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ICardCache } from '../../domain/repositories/card-cache.interface';
import { CardDetailDto } from '../../presentation/dto/card-detail.dto';
import { CardMapper } from '../../presentation/mappers/card.mapper';

export interface GetCardByIdResult {
  card: CardDetailDto;
}

/**
 * Get Card By ID Use Case
 * Retrieves detailed information about a specific card
 */
@Injectable()
export class GetCardByIdUseCase {
  constructor(
    @Inject(ICardCache)
    private readonly cardCache: ICardCache,
  ) {}

  async execute(cardId: string): Promise<GetCardByIdResult> {
    // Get card from cache
    const card = this.cardCache.getCard(cardId);

    if (!card) {
      throw new NotFoundException(`Card not found: ${cardId}`);
    }

    // Map to DTO
    const cardDetail = CardMapper.toCardDetailDto(card);

    return {
      card: cardDetail,
    };
  }
}

