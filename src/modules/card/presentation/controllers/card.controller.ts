import {
  Controller,
  Get,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { GetAvailableSetsUseCase } from '../../application/use-cases/get-available-sets.use-case';
import { PreviewSetUseCase } from '../../application/use-cases/preview-set.use-case';
import { PreviewCardUseCase } from '../../application/use-cases/preview-card.use-case';
import { GetAvailableSetsResponseDto } from '../dto/get-available-sets-response.dto';
import { GetCardsResponseDto } from '../dto/get-cards-response.dto';
import { CardDetailDto } from '../dto/card-detail.dto';

/**
 * Card Controller
 * Handles HTTP requests for card operations (file-based only)
 */
@Controller('api/v1/cards')
export class CardController {
  constructor(
    private readonly getAvailableSetsUseCase: GetAvailableSetsUseCase,
    private readonly previewSetUseCase: PreviewSetUseCase,
    private readonly previewCardUseCase: PreviewCardUseCase,
  ) {}

  /**
   * Get all available card sets from file system
   */
  @Get('sets/available')
  @HttpCode(HttpStatus.OK)
  async getAvailableSets(): Promise<GetAvailableSetsResponseDto> {
    return await this.getAvailableSetsUseCase.execute();
  }

  /**
   * Preview cards from a set file (direct read from disk)
   */
  @Get('sets/preview/:author/:setName/v:version')
  @HttpCode(HttpStatus.OK)
  async previewSet(
    @Param('author') author: string,
    @Param('setName') setName: string,
    @Param('version') version: string,
  ): Promise<GetCardsResponseDto> {
    return await this.previewSetUseCase.execute(author, setName, version);
  }

  /**
   * Preview a specific card from a set file (direct read from disk)
   */
  @Get('sets/preview/:author/:setName/v:version/card/:cardNumber')
  @HttpCode(HttpStatus.OK)
  async previewCard(
    @Param('author') author: string,
    @Param('setName') setName: string,
    @Param('version') version: string,
    @Param('cardNumber') cardNumber: string,
  ): Promise<CardDetailDto> {
    return await this.previewCardUseCase.execute(
      author,
      setName,
      version,
      cardNumber,
    );
  }
}

