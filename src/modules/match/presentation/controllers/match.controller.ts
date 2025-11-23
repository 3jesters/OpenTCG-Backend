import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  CreateMatchUseCase,
  JoinMatchUseCase,
  StartMatchUseCase,
  ExecuteTurnActionUseCase,
  GetMatchStateUseCase,
  ListMatchesUseCase,
} from '../../application/use-cases';
import {
  CreateMatchRequestDto,
  JoinMatchRequestDto,
  ExecuteActionRequestDto,
  MatchResponseDto,
  MatchStateResponseDto,
  MatchListResponseDto,
} from '../dto';
import { CreateMatchDto, JoinMatchDto, ExecuteActionDto } from '../../application/dto';
import { PlayerIdentifier, MatchState } from '../../domain';

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
    private readonly executeTurnActionUseCase: ExecuteTurnActionUseCase,
    private readonly getMatchStateUseCase: GetMatchStateUseCase,
    private readonly listMatchesUseCase: ListMatchesUseCase,
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
   * POST /api/v1/matches
   * Create a new match
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() requestDto: CreateMatchRequestDto,
  ): Promise<MatchResponseDto> {
    const dto: CreateMatchDto = {
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
    @Body('firstPlayer') firstPlayer: PlayerIdentifier,
  ): Promise<MatchResponseDto> {
    const match = await this.startMatchUseCase.execute(matchId, firstPlayer);
    return MatchResponseDto.fromDomain(match);
  }

  /**
   * GET /api/v1/matches/:matchId/state
   * Get current match state for a player
   */
  @Get(':matchId/state')
  @HttpCode(HttpStatus.OK)
  async getState(
    @Param('matchId') matchId: string,
    @Body('playerId') playerId: string,
  ): Promise<MatchStateResponseDto> {
    const match = await this.getMatchStateUseCase.execute(matchId, playerId);
    return MatchStateResponseDto.fromDomain(match, playerId);
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
    const dto: ExecuteActionDto = {
      matchId,
      playerId: requestDto.playerId,
      actionType: requestDto.actionType,
      actionData: requestDto.actionData,
    };

    const match = await this.executeTurnActionUseCase.execute(dto);
    return MatchStateResponseDto.fromDomain(match, requestDto.playerId);
  }
}

