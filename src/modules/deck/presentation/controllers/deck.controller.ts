import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import {
  CreateDeckUseCase,
  GetDeckByIdUseCase,
  ListDecksUseCase,
  UpdateDeckUseCase,
  DeleteDeckUseCase,
  ValidateDeckAgainstTournamentUseCase,
} from '../../application/use-cases';
import {
  CreateDeckRequestDto,
  UpdateDeckRequestDto,
  ValidateDeckRequestDto,
  DeckResponseDto,
  DeckListResponseDto,
  ValidationResponseDto,
  DeckCardResponseDto,
} from '../dto';
import { CreateDeckDto, UpdateDeckDto } from '../../application/dto';
import { IGetCardByIdUseCase } from '../../../card/application/ports/card-use-cases.interface';

/**
 * Deck Controller
 * Handles HTTP requests for deck management
 */
@Controller('api/v1/decks')
export class DeckController {
  constructor(
    private readonly createDeckUseCase: CreateDeckUseCase,
    private readonly getDeckByIdUseCase: GetDeckByIdUseCase,
    private readonly listDecksUseCase: ListDecksUseCase,
    private readonly updateDeckUseCase: UpdateDeckUseCase,
    private readonly deleteDeckUseCase: DeleteDeckUseCase,
    private readonly validateDeckAgainstTournamentUseCase: ValidateDeckAgainstTournamentUseCase,
    @Inject(IGetCardByIdUseCase)
    private readonly getCardByIdUseCase: IGetCardByIdUseCase,
  ) {}

  /**
   * POST /api/v1/decks
   * Create a new deck
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() requestDto: CreateDeckRequestDto,
  ): Promise<DeckResponseDto> {
    // Map request DTO to application DTO
    const dto: CreateDeckDto = {
      name: requestDto.name,
      createdBy: requestDto.createdBy,
      tournamentId: requestDto.tournamentId,
      cards: requestDto.cards?.map((c) => ({
        cardId: c.cardId,
        setName: c.setName,
        quantity: c.quantity,
      })),
    };

    const deck = await this.createDeckUseCase.execute(dto);
    return DeckResponseDto.fromDomain(deck);
  }

  /**
   * GET /api/v1/decks
   * Get all decks, optionally filtered by tournament
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('tournamentId') tournamentId?: string,
  ): Promise<DeckListResponseDto> {
    const decks = await this.listDecksUseCase.execute(tournamentId);
    return DeckListResponseDto.fromDomain(decks);
  }

  /**
   * GET /api/v1/decks/:id/cards
   * Get just the cards list for a deck (cardId, setName, quantity)
   */
  @Get(':id/cards')
  @HttpCode(HttpStatus.OK)
  async getDeckCards(@Param('id') id: string): Promise<DeckCardResponseDto[]> {
    const deck = await this.getDeckByIdUseCase.execute(id);
    return deck.cards.map((c) => DeckCardResponseDto.fromDomain(c));
  }

  /**
   * GET /api/v1/decks/:id
   * Get deck by ID with full card details
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<DeckResponseDto> {
    const deck = await this.getDeckByIdUseCase.execute(id);

    // Fetch full card details for all unique cards in the deck
    const uniqueCardIds = [...new Set(deck.cards.map((c) => c.cardId))];
    const cardDetailsMap = new Map<string, any>();

    // Fetch all card details in parallel
    await Promise.all(
      uniqueCardIds.map(async (cardId) => {
        try {
          const cardDetail = await this.getCardByIdUseCase.execute(cardId);
          cardDetailsMap.set(cardId, cardDetail);
        } catch (error) {
          // If card not found, skip it (card will be returned without details)
          console.error(`Failed to fetch card ${cardId}:`, error.message);
        }
      }),
    );

    // Create deck response with card details
    const dto = DeckResponseDto.fromDomain(deck);
    dto.cards = deck.cards.map((deckCard) => {
      const cardDetail = cardDetailsMap.get(deckCard.cardId);
      return cardDetail
        ? DeckCardResponseDto.fromDomainWithCard(deckCard, cardDetail)
        : DeckCardResponseDto.fromDomain(deckCard);
    });

    return dto;
  }

  /**
   * PUT /api/v1/decks/:id
   * Update deck
   */
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() requestDto: UpdateDeckRequestDto,
  ): Promise<DeckResponseDto> {
    // Map request DTO to application DTO
    const dto: UpdateDeckDto = {
      name: requestDto.name,
      tournamentId: requestDto.tournamentId,
      cards: requestDto.cards?.map((c) => ({
        cardId: c.cardId,
        setName: c.setName,
        quantity: c.quantity,
      })),
    };

    const deck = await this.updateDeckUseCase.execute(id, dto);
    return DeckResponseDto.fromDomain(deck);
  }

  /**
   * DELETE /api/v1/decks/:id
   * Delete deck
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.deleteDeckUseCase.execute(id);
  }

  /**
   * POST /api/v1/decks/:id/validate
   * Validate deck against tournament rules
   */
  @Post(':id/validate')
  @HttpCode(HttpStatus.OK)
  async validate(
    @Param('id') id: string,
    @Body() requestDto: ValidateDeckRequestDto,
  ): Promise<ValidationResponseDto> {
    const result = await this.validateDeckAgainstTournamentUseCase.execute(
      id,
      requestDto.tournamentId,
    );
    return ValidationResponseDto.fromDomain(result);
  }
}
