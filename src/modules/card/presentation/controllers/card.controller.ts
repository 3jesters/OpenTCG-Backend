import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LoadCardsFromFileUseCase } from '../../application/use-cases/load-cards-from-file.use-case';
import { GetLoadedSetsUseCase } from '../../application/use-cases/get-loaded-sets.use-case';
import { GetCardsFromSetUseCase } from '../../application/use-cases/get-cards-from-set.use-case';
import { GetCardByIdUseCase } from '../../application/use-cases/get-card-by-id.use-case';
import { SearchCardsUseCase } from '../../application/use-cases/search-cards.use-case';
import { LoadCardsRequestDto } from '../dto/load-cards-request.dto';
import { LoadCardsResponseDto } from '../dto/load-cards-response.dto';
import { LoadSetResultDto } from '../dto/load-set-result.dto';
import { GetSetsResponseDto } from '../dto/get-sets-response.dto';
import { GetCardsResponseDto } from '../dto/get-cards-response.dto';
import { CardDetailDto } from '../dto/card-detail.dto';
import { SearchCardsRequestDto } from '../dto/search-cards-request.dto';
import { SearchCardsResponseDto } from '../dto/search-cards-response.dto';

/**
 * Card Controller
 * Handles HTTP requests for card operations
 */
@Controller('api/v1/cards')
export class CardController {
  constructor(
    private readonly loadCardsFromFileUseCase: LoadCardsFromFileUseCase,
    private readonly getLoadedSetsUseCase: GetLoadedSetsUseCase,
    private readonly getCardsFromSetUseCase: GetCardsFromSetUseCase,
    private readonly getCardByIdUseCase: GetCardByIdUseCase,
    private readonly searchCardsUseCase: SearchCardsUseCase,
  ) {}

  @Post('load')
  @HttpCode(HttpStatus.OK)
  async loadCards(
    @Body() request: LoadCardsRequestDto,
  ): Promise<LoadCardsResponseDto> {
    const results: LoadSetResultDto[] = [];
    let totalLoaded = 0;
    let overallSuccess = true;

    // Process each set sequentially to maintain order
    for (const set of request.sets) {
      try {
        const result = await this.loadCardsFromFileUseCase.execute(
          set.author,
          set.setName,
          set.version,
        );

        totalLoaded += result.loaded;

        results.push({
          success: true,
          author: result.author,
          setName: result.setName,
          version: result.version,
          loaded: result.loaded,
          filename: this.constructFilename(set.author, set.setName, set.version),
        });
      } catch (error) {
        overallSuccess = false;

        results.push({
          success: false,
          author: set.author,
          setName: set.setName,
          version: set.version,
          loaded: 0,
          filename: this.constructFilename(set.author, set.setName, set.version),
          error: error.message || 'Unknown error occurred',
        });
      }
    }

    return {
      success: overallSuccess,
      totalLoaded,
      results,
    };
  }

  /**
   * Get all loaded card sets
   */
  @Get('sets')
  @HttpCode(HttpStatus.OK)
  async getLoadedSets(
    @Query('author') author?: string,
    @Query('official') official?: string,
  ): Promise<GetSetsResponseDto> {
    const filters: any = {};

    if (author) {
      filters.author = author;
    }

    if (official !== undefined) {
      filters.official = official === 'true';
    }

    return await this.getLoadedSetsUseCase.execute(filters);
  }

  /**
   * Get all cards from a specific set
   */
  @Get('sets/:author/:setName/v:version')
  @HttpCode(HttpStatus.OK)
  async getCardsFromSet(
    @Param('author') author: string,
    @Param('setName') setName: string,
    @Param('version') version: string,
  ): Promise<GetCardsResponseDto> {
    return await this.getCardsFromSetUseCase.execute(author, setName, version);
  }

  /**
   * Search cards with filters
   */
  @Get('search')
  @HttpCode(HttpStatus.OK)
  async searchCards(
    @Query() query: SearchCardsRequestDto,
  ): Promise<SearchCardsResponseDto> {
    return await this.searchCardsUseCase.execute(query);
  }

  /**
   * Get a specific card by ID
   */
  @Get(':cardId')
  @HttpCode(HttpStatus.OK)
  async getCardById(@Param('cardId') cardId: string): Promise<CardDetailDto> {
    const result = await this.getCardByIdUseCase.execute(cardId);
    return result.card;
  }

  private constructFilename(author: string, setName: string, version: string): string {
    return `${author}-${setName}-v${version}.json`;
  }
}

