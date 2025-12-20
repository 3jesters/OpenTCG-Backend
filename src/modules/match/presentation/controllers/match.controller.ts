import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  CreateMatchUseCase,
  JoinMatchUseCase,
  StartMatchUseCase,
  GetMatchByIdUseCase,
  GetMatchStateUseCase,
  ListMatchesUseCase,
  CancelMatchUseCase,
  ProcessActionUseCase,
} from '../../application/use-cases';
import {
  CreateMatchRequestDto,
  JoinMatchRequestDto,
  ExecuteActionRequestDto,
  GetMatchStateRequestDto,
  StartMatchRequestDto,
  MatchResponseDto,
  MatchStateResponseDto,
  MatchListResponseDto,
} from '../dto';
import {
  CreateMatchDto,
  JoinMatchDto,
} from '../../application/dto';
import {
  MatchState,
} from '../../domain';

/**
 * Match Controller
 * Handles HTTP requests for match management
 */
@Controller('api/v1/matches')
export class MatchController {
  constructor(
    private readonly createMatchUseCase: CreateMatchUseCase,
    private readonly joinMatchUseCase: JoinMatchUseCase,
    private readonly startMatchUseCase: StartMatchUseCase,
    private readonly processActionUseCase: ProcessActionUseCase,
    private readonly getMatchByIdUseCase: GetMatchByIdUseCase,
    private readonly getMatchStateUseCase: GetMatchStateUseCase,
    private readonly listMatchesUseCase: ListMatchesUseCase,
    private readonly cancelMatchUseCase: CancelMatchUseCase,
  ) {}

  /**
   * GET /api/v1/matches
   * Get all matches, optionally filtered by tournament, player, or state
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('tournamentId') tournamentId?: string,
    @Query('playerId') playerId?: string,
    @Query('state') state?: string,
  ): Promise<MatchListResponseDto> {
    const matchState = state ? (state as MatchState) : undefined;
    const matches = await this.listMatchesUseCase.execute(
      tournamentId,
      playerId,
      matchState,
    );
    return MatchListResponseDto.fromDomain(matches);
  }

  /**
   * GET /api/v1/matches/:matchId
   * Get a specific match by ID
   */
  @Get(':matchId')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('matchId') matchId: string): Promise<MatchResponseDto> {
    const match = await this.getMatchByIdUseCase.execute(matchId);
    return MatchResponseDto.fromDomain(match);
  }

  /**
   * POST /api/v1/matches
   * Create a new match
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() requestDto: CreateMatchRequestDto,
  ): Promise<MatchResponseDto> {
    const dto: CreateMatchDto = {
      id: requestDto.id,
      tournamentId: requestDto.tournamentId,
      player1Id: requestDto.player1Id,
      player1DeckId: requestDto.player1DeckId,
    };

    const match = await this.createMatchUseCase.execute(dto);
    return MatchResponseDto.fromDomain(match);
  }

  /**
   * POST /api/v1/matches/:matchId/join
   * Join an existing match
   */
  @Post(':matchId/join')
  @HttpCode(HttpStatus.OK)
  async join(
    @Param('matchId') matchId: string,
    @Body() requestDto: JoinMatchRequestDto,
  ): Promise<MatchResponseDto> {
    const dto: JoinMatchDto = {
      matchId,
      playerId: requestDto.playerId,
      deckId: requestDto.deckId,
    };

    const match = await this.joinMatchUseCase.execute(dto);
    return MatchResponseDto.fromDomain(match);
  }

  /**
   * POST /api/v1/matches/:matchId/start
   * Start a match (after coin flip)
   */
  @Post(':matchId/start')
  @HttpCode(HttpStatus.OK)
  async start(
    @Param('matchId') matchId: string,
    @Body() requestDto: StartMatchRequestDto,
  ): Promise<MatchResponseDto> {
    const match = await this.startMatchUseCase.execute(
      matchId,
      requestDto.firstPlayer,
    );
    return MatchResponseDto.fromDomain(match);
  }

  /**
   * POST /api/v1/matches/:matchId/state
   * Get current match state for a player
   */
  @Post(':matchId/state')
  @HttpCode(HttpStatus.OK)
  async getState(
    @Param('matchId') matchId: string,
    @Body() requestDto: GetMatchStateRequestDto,
  ): Promise<MatchStateResponseDto> {
    const { match, availableActions } = await this.getMatchStateUseCase.execute(
      matchId,
      requestDto.playerId,
    );
    return await MatchStateResponseDto.fromDomain(
      match,
      requestDto.playerId,
      availableActions,
    );
  }

  /**
   * POST /api/v1/matches/:matchId/actions
   * Execute a player action
   */
  @Post(':matchId/actions')
  @HttpCode(HttpStatus.OK)
  async executeAction(
    @Param('matchId') matchId: string,
    @Body() requestDto: ExecuteActionRequestDto,
  ): Promise<MatchStateResponseDto> {
    const { match, availableActions } =
      await this.processActionUseCase.execute(requestDto, matchId);

    return await MatchStateResponseDto.fromDomain(
      match,
      requestDto.playerId,
      availableActions,
    );
  }

  /**
   * DELETE /api/v1/matches/:matchId/cancel
   * Cancel and delete a match in WAITING_FOR_PLAYERS state
   */
  @Delete(':matchId/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelMatch(
    @Param('matchId') matchId: string,
    @Query('playerId') playerId: string,
  ): Promise<void> {
    if (!playerId) {
      throw new BadRequestException('playerId query parameter is required');
    }

    await this.cancelMatchUseCase.execute(matchId, playerId);
  }
}
