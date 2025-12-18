import { Controller, Get, Param, HttpCode, HttpStatus, Inject } from '@nestjs/common';
import {
  IGetAvailableSetsUseCase,
  IPreviewSetUseCase,
  IPreviewCardUseCase,
} from '../../application/ports/card-use-cases.interface';
import { GetAvailableSetsResponseDto } from '../dto/get-available-sets-response.dto';
import { GetCardsResponseDto } from '../dto/get-cards-response.dto';
import { CardDetailDto } from '../dto/card-detail.dto';

/**
 * Card Controller
 * Handles HTTP requests for card operations
 * Uses interface injection to support both file-based (dev/test) and database (staging/prod) implementations
 */
@Controller('api/v1/cards')
export class CardController {
  constructor(
    @Inject(IGetAvailableSetsUseCase)
    private readonly getAvailableSetsUseCase: IGetAvailableSetsUseCase,
    @Inject(IPreviewSetUseCase)
    private readonly previewSetUseCase: IPreviewSetUseCase,
    @Inject(IPreviewCardUseCase)
    private readonly previewCardUseCase: IPreviewCardUseCase,
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
