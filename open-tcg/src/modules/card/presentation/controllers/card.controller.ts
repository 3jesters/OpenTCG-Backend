import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { LoadCardsFromFileUseCase } from '../../application/use-cases/load-cards-from-file.use-case';
import { LoadCardsRequestDto } from '../dto/load-cards-request.dto';
import { LoadCardsResponseDto } from '../dto/load-cards-response.dto';
import { LoadSetResultDto } from '../dto/load-set-result.dto';

/**
 * Card Controller
 * Handles HTTP requests for card operations
 */
@Controller('api/v1/cards')
export class CardController {
  constructor(
    private readonly loadCardsFromFileUseCase: LoadCardsFromFileUseCase,
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

  private constructFilename(author: string, setName: string, version: string): string {
    return `${author}-${setName}-v${version}.json`;
  }
}

