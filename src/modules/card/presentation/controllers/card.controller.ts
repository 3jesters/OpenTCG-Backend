import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Inject,
  UseGuards,
} from '@nestjs/common';
import {
  IGetAvailableSetsUseCase,
  IPreviewSetUseCase,
  IPreviewCardUseCase,
  ICalculateCardStrengthUseCase,
  ISearchCardsUseCase,
  IGetCardByIdUseCase,
} from '../../application/ports/card-use-cases.interface';
import { DuplicateCardUseCase } from '../../application/use-cases/duplicate-card.use-case';
import { GetAvailableSetsResponseDto } from '../dto/get-available-sets-response.dto';
import { GetCardsResponseDto } from '../dto/get-cards-response.dto';
import { CardDetailDto } from '../dto/card-detail.dto';
import { CardStrengthResponseDto } from '../dto/card-strength-response.dto';
import { SearchCardsRequestDto } from '../dto/search-cards-request.dto';
import { SearchCardsResponseDto } from '../dto/search-cards-response.dto';
import { ListSetsRequestDto } from '../dto/list-sets-request.dto';
import { DuplicateCardDto } from '../dto/duplicate-card.dto';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import { CurrentUser } from '../../../auth/infrastructure/decorators/current-user.decorator';
import type { JwtPayload } from '../../../auth/infrastructure/services/jwt.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

/**
 * Card Controller
 * Handles HTTP requests for card operations
 * Uses interface injection to support both file-based (dev/test) and database (staging/prod) implementations
 */
@ApiTags('cards')
@Controller('api/v1/cards')
export class CardController {
  constructor(
    @Inject(IGetAvailableSetsUseCase)
    private readonly getAvailableSetsUseCase: IGetAvailableSetsUseCase,
    @Inject(IPreviewSetUseCase)
    private readonly previewSetUseCase: IPreviewSetUseCase,
    @Inject(IPreviewCardUseCase)
    private readonly previewCardUseCase: IPreviewCardUseCase,
    @Inject(ICalculateCardStrengthUseCase)
    private readonly calculateCardStrengthUseCase: ICalculateCardStrengthUseCase,
    @Inject(ISearchCardsUseCase)
    private readonly searchCardsUseCase: ISearchCardsUseCase,
    @Inject(IGetCardByIdUseCase)
    private readonly getCardByIdUseCase: IGetCardByIdUseCase,
    private readonly duplicateCardUseCase: DuplicateCardUseCase,
  ) {}

  /**
   * Get all available card sets from file system (legacy endpoint)
   * Must come before 'sets' route to avoid route conflicts
   */
  @Get('sets/available')
  @HttpCode(HttpStatus.OK)
  async getAvailableSets(): Promise<GetAvailableSetsResponseDto> {
    return await this.getAvailableSetsUseCase.execute();
  }

  /**
   * List available card sets with optional filtering
   */
  @Get('sets')
  @HttpCode(HttpStatus.OK)
  async listSets(
    @Query() query: ListSetsRequestDto,
  ): Promise<GetAvailableSetsResponseDto> {
    return await this.getAvailableSetsUseCase.execute(
      query.author,
      query.official,
    );
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

  /**
   * Search and filter cards with pagination
   */
  @Get('search')
  @HttpCode(HttpStatus.OK)
  async searchCards(
    @Query() query: SearchCardsRequestDto,
  ): Promise<SearchCardsResponseDto> {
    return await this.searchCardsUseCase.execute(query);
  }

  /**
   * Calculate card strength for a card by cardId
   */
  @Get('strength/:cardId')
  @HttpCode(HttpStatus.OK)
  async calculateCardStrength(
    @Param('cardId') cardId: string,
  ): Promise<CardStrengthResponseDto> {
    const result = await this.calculateCardStrengthUseCase.execute(cardId);
    return CardStrengthResponseDto.fromDomain(result);
  }

  /**
   * Get a card by its full cardId
   * Searches across all available sets to find the card
   * Must be placed after more specific routes to avoid conflicts
   */
  @Get(':cardId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get card by cardId' })
  @ApiResponse({ status: 200, description: 'Card found', type: CardDetailDto })
  @ApiResponse({ status: 404, description: 'Card not found' })
  async getCardById(
    @Param('cardId') cardId: string,
  ): Promise<CardDetailDto> {
    return await this.getCardByIdUseCase.execute(cardId);
  }

  /**
   * Duplicate a card from any set into a user's private set
   * @param dto - Duplication request data
   * @param user - Authenticated user from JWT token
   * @param userId - User ID from query parameter (for backward compatibility)
   */
  @Post('duplicate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Duplicate a card into a user\'s private set' })
  @ApiResponse({ status: 201, description: 'Card duplicated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @HttpCode(HttpStatus.CREATED)
  async duplicateCard(
    @Body() dto: DuplicateCardDto,
    @CurrentUser() user: JwtPayload,
    @Query('userId') userId?: string,
  ): Promise<CardDetailDto> {
    const effectiveUserId = user?.sub || userId;
    if (!effectiveUserId) {
      throw new Error('User ID is required. Please authenticate or provide ?userId=xxx for backward compatibility.');
    }
    return await this.duplicateCardUseCase.execute(
      dto.sourceCardId,
      effectiveUserId,
      dto.targetSetId,
      dto.targetSetName,
    );
  }
}
