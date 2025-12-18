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
  Inject,
} from '@nestjs/common';
import {
  CreateMatchUseCase,
  JoinMatchUseCase,
  StartMatchUseCase,
  ExecuteTurnActionUseCase,
  GetMatchByIdUseCase,
  GetMatchStateUseCase,
  ListMatchesUseCase,
  CancelMatchUseCase,
} from '../../application/use-cases';
import { IGetCardByIdUseCase } from '../../../card/application/ports/card-use-cases.interface';
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
  ExecuteActionDto,
} from '../../application/dto';
import {
  Match,
  PlayerIdentifier,
  MatchState,
  PlayerActionType,
  TurnPhase,
  CoinFlipStatus,
  CoinFlipContext,
} from '../../domain';
import { MatchStateMachineService } from '../../domain/services';

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
    private readonly getMatchByIdUseCase: GetMatchByIdUseCase,
    private readonly getMatchStateUseCase: GetMatchStateUseCase,
    private readonly listMatchesUseCase: ListMatchesUseCase,
    private readonly cancelMatchUseCase: CancelMatchUseCase,
    private readonly stateMachineService: MatchStateMachineService,
    @Inject(IGetCardByIdUseCase)
    private readonly getCardByIdUseCase: IGetCardByIdUseCase,
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
    const dto: ExecuteActionDto = {
      matchId,
      playerId: requestDto.playerId,
      actionType: requestDto.actionType,
      actionData: requestDto.actionData,
    };

    const match = await this.executeTurnActionUseCase.execute(dto);

    // Compute available actions for the updated match state
    const availableActions = this.stateMachineService.getAvailableActions(
      match.state,
      match.gameState?.phase || null,
      match.gameState
        ? {
            lastAction: match.gameState.lastAction
              ? {
                  actionType: match.gameState.lastAction.actionType,
                  playerId: match.gameState.lastAction.playerId,
                  actionData: match.gameState.lastAction.actionData,
                  actionId: match.gameState.lastAction.actionId,
                }
              : null,
            actionHistory: [
              ...match.gameState.actionHistory.map((action) => ({
                actionType: action.actionType,
                playerId: action.playerId,
                actionId: action.actionId,
              })),
              // Include lastAction in history if it exists and isn't already the last item
              ...(match.gameState.lastAction &&
              (match.gameState.actionHistory.length === 0 ||
                match.gameState.actionHistory[
                  match.gameState.actionHistory.length - 1
                ].actionId !== match.gameState.lastAction.actionId)
                ? [
                    {
                      actionType: match.gameState.lastAction.actionType,
                      playerId: match.gameState.lastAction.playerId,
                      actionId: match.gameState.lastAction.actionId,
                    },
                  ]
                : []),
            ],
            player1State: match.gameState.player1State,
            player2State: match.gameState.player2State,
          }
        : undefined,
      match.currentPlayer || undefined,
    );

    // Filter actions based on player context
    const playerIdentifier = match.getPlayerIdentifier(requestDto.playerId);
    const filteredActions = this.filterActionsForPlayer(
      availableActions,
      match,
      playerIdentifier!,
    );

    return await MatchStateResponseDto.fromDomain(
      match,
      requestDto.playerId,
      filteredActions,
    );
  }

  /**
   * Filter available actions based on player context
   */
  private filterActionsForPlayer(
    actions: PlayerActionType[],
    match: Match,
    playerIdentifier: PlayerIdentifier,
  ): PlayerActionType[] {
    // PLAYER_TURN: only show actions if it's the player's turn
    if (match.state === MatchState.PLAYER_TURN) {
      if (match.currentPlayer !== playerIdentifier) {
        // Not player's turn - only show CONCEDE
        return [PlayerActionType.CONCEDE];
      }

      // Add GENERATE_COIN_FLIP if coin flip is ready for ATTACK context (both players can approve)
      // STATUS_CHECK contexts (confusion/sleep) are handled automatically - coin flip state is created
      // automatically, client can call GENERATE_COIN_FLIP when coinFlipState exists, but it doesn't need to be in availableActions
      if (
        match.gameState?.coinFlipState &&
        match.gameState.coinFlipState.status === CoinFlipStatus.READY_TO_FLIP
      ) {
        const coinFlipContext = match.gameState.coinFlipState.context;
        if (coinFlipContext === CoinFlipContext.ATTACK) {
          if (!actions.includes(PlayerActionType.GENERATE_COIN_FLIP)) {
            actions.push(PlayerActionType.GENERATE_COIN_FLIP);
          }
        }
      }

      // Filter out ATTACH_ENERGY if energy was already attached this turn
      const playerState = match.gameState?.getPlayerState(playerIdentifier);
      if (
        playerState?.hasAttachedEnergyThisTurn &&
        match.gameState?.phase === TurnPhase.MAIN_PHASE
      ) {
        return actions.filter(
          (action) => action !== PlayerActionType.ATTACH_ENERGY,
        );
      }

      return actions; // Already filtered by state machine
    }

    // DRAWING_CARDS: all players can draw
    if (match.state === MatchState.DRAWING_CARDS) {
      // Check if player already has drawn valid initial hand
      const playerHasDrawnValidHand =
        playerIdentifier === PlayerIdentifier.PLAYER1
          ? match.player1HasDrawnValidHand
          : match.player2HasDrawnValidHand;

      if (playerHasDrawnValidHand) {
        // Player already has valid initial hand, wait for opponent
        return [PlayerActionType.CONCEDE];
      }
      // Player can draw
      return actions;
    }

    // SELECT_ACTIVE_POKEMON: check if player has set active Pokemon
    if (match.state === MatchState.SELECT_ACTIVE_POKEMON) {
      const playerState = match.gameState?.getPlayerState(playerIdentifier);
      if (playerState?.activePokemon === null) {
        // Hasn't set active Pokemon yet, allow SET_ACTIVE_POKEMON
        return actions.filter(
          (action) =>
            action === PlayerActionType.SET_ACTIVE_POKEMON ||
            action === PlayerActionType.CONCEDE,
        );
      }
      // Has set active Pokemon, wait for opponent
      return [PlayerActionType.CONCEDE];
    }

    // SELECT_BENCH_POKEMON: player can play Pokemon or complete setup
    if (match.state === MatchState.SELECT_BENCH_POKEMON) {
      const playerState = match.gameState?.getPlayerState(playerIdentifier);
      const playerReady =
        playerIdentifier === PlayerIdentifier.PLAYER1
          ? match.player1ReadyToStart
          : match.player2ReadyToStart;

      if (playerReady) {
        // Player is ready, wait for opponent
        return [PlayerActionType.CONCEDE];
      }
      // Player can play Pokemon or complete setup
      return actions;
    }

    // INITIAL_SETUP: check if player has set active Pokemon (legacy state)
    if (match.state === MatchState.INITIAL_SETUP) {
      const playerState = match.gameState?.getPlayerState(playerIdentifier);
      if (playerState?.activePokemon === null) {
        // Hasn't set active Pokemon yet, allow SET_ACTIVE_POKEMON and PLAY_POKEMON
        return actions.filter(
          (action) =>
            action === PlayerActionType.SET_ACTIVE_POKEMON ||
            action === PlayerActionType.PLAY_POKEMON ||
            action === PlayerActionType.CONCEDE,
        );
      }
      // Has set active Pokemon, allow PLAY_POKEMON and COMPLETE_INITIAL_SETUP
      return [
        PlayerActionType.PLAY_POKEMON,
        PlayerActionType.COMPLETE_INITIAL_SETUP,
        PlayerActionType.CONCEDE,
      ];
    }

    // Other states: return as-is (typically just CONCEDE)
    return actions;
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
