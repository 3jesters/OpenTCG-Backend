import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { BaseActionHandler } from '../base-action-handler';
import { IActionHandler } from '../action-handler.interface';
import { ExecuteActionDto } from '../../dto';
import {
  Match,
  PlayerIdentifier,
  GameState,
  TurnPhase,
  PlayerActionType,
  ActionSummary,
  StatusEffect,
} from '../../../domain';
import { Card } from '../../../../card/domain/entities';
import { IMatchRepository } from '../../../domain/repositories';
import {
  MatchStateMachineService,
  CoinFlipResolverService,
} from '../../../domain/services';
import { IGetCardByIdUseCase } from '../../../../card/application/ports/card-use-cases.interface';
import { CoinFlipStatus } from '../../../domain/enums/coin-flip-status.enum';
import { CoinFlipContext } from '../../../domain/enums/coin-flip-context.enum';
import {
  CoinFlipCountType,
  CoinFlipState,
} from '../../../domain/value-objects';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate Coin Flip Action Handler
 * Handles generating coin flip results for attacks and status checks
 * Note: ATTACK context coin flip logic is complex and tightly coupled with ATTACK handler
 * For ATTACK context, this handler generates the coin flips but delegates attack execution
 * back to use case for now (can be extracted to AttackExecutionService in Phase 5)
 */
@Injectable()
export class GenerateCoinFlipActionHandler
  extends BaseActionHandler
  implements IActionHandler
{
  constructor(
    @Inject(IMatchRepository)
    protected readonly matchRepository: IMatchRepository,
    protected readonly stateMachineService: MatchStateMachineService,
    @Inject(IGetCardByIdUseCase)
    protected readonly getCardByIdUseCase: IGetCardByIdUseCase,
    private readonly coinFlipResolver: CoinFlipResolverService,
  ) {
    super(matchRepository, stateMachineService, getCardByIdUseCase);
  }

  async execute(
    dto: ExecuteActionDto,
    match: Match,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    cardsMap: Map<string, Card>,
  ): Promise<Match> {
    // Validate coin flip state exists
    if (!gameState.coinFlipState) {
      throw new BadRequestException('No coin flip in progress');
    }

    const coinFlipState = gameState.coinFlipState;

    // For ATTACK context, allow both players to approve (no player restriction)
    // For other contexts, maintain original behavior
    if (
      coinFlipState.context !== CoinFlipContext.ATTACK &&
      gameState.currentPlayer !== playerIdentifier
    ) {
      throw new BadRequestException('Not your turn to flip coin');
    }

    // Validate status
    if (coinFlipState.status !== CoinFlipStatus.READY_TO_FLIP) {
      throw new BadRequestException(
        `Coin flip not ready. Current status: ${coinFlipState.status}`,
      );
    }

    // Check if coin flip already has results (already generated)
    // If so, this is just an approval tracking update
    if (coinFlipState.results.length > 0) {
      // Coin flip already generated, just track approval
      let updatedCoinFlipState = coinFlipState;
      if (playerIdentifier === PlayerIdentifier.PLAYER1) {
        if (coinFlipState.player1HasApproved) {
          throw new BadRequestException(
            'Player 1 has already approved this coin flip',
          );
        }
        updatedCoinFlipState = coinFlipState.withPlayer1Approval();
      } else {
        if (coinFlipState.player2HasApproved) {
          throw new BadRequestException(
            'Player 2 has already approved this coin flip',
          );
        }
        updatedCoinFlipState = coinFlipState.withPlayer2Approval();
      }

      // Update game state with approval
      const updatedGameState =
        gameState.withCoinFlipState(updatedCoinFlipState);
      match.updateGameState(updatedGameState);
      return await this.matchRepository.save(match);
    }

    // Track which player approved (first approval triggers coin flip generation)
    let updatedCoinFlipState = coinFlipState;
    if (playerIdentifier === PlayerIdentifier.PLAYER1) {
      if (coinFlipState.player1HasApproved) {
        throw new BadRequestException(
          'Player 1 has already approved this coin flip',
        );
      }
      updatedCoinFlipState = coinFlipState.withPlayer1Approval();
    } else {
      if (coinFlipState.player2HasApproved) {
        throw new BadRequestException(
          'Player 2 has already approved this coin flip',
        );
      }
      updatedCoinFlipState = coinFlipState.withPlayer2Approval();
    }

    // For ATTACK context, use the attacking player's state for coin flip calculation
    const attackingPlayer =
      coinFlipState.context === CoinFlipContext.ATTACK
        ? gameState.currentPlayer
        : playerIdentifier;
    const playerState = gameState.getPlayerState(attackingPlayer);
    const opponentState = gameState.getOpponentState(attackingPlayer);

    // Calculate number of coins to flip
    const activePokemon = playerState.activePokemon;
    const coinCount = this.coinFlipResolver.calculateCoinCount(
      coinFlipState.configuration,
      playerState,
      activePokemon,
    );

    // Generate coin flips (deterministic - same for both players)
    const actionId = coinFlipState.actionId || uuidv4();
    const results: any[] = [];

    // Handle "until tails" pattern - generate all flips until tails (or max limit)
    if (
      updatedCoinFlipState.configuration.countType ===
      CoinFlipCountType.UNTIL_TAILS
    ) {
      let flipIndex = 0;
      while (flipIndex < coinCount) {
        const result = this.coinFlipResolver.generateCoinFlip(
          match.id,
          gameState.turnNumber,
          actionId,
          flipIndex,
        );
        updatedCoinFlipState = updatedCoinFlipState.withResult(result);
        results.push({
          flipIndex: result.flipIndex,
          result: result.result,
        });

        // Stop if we got tails
        if (result.isTails()) {
          break;
        }
        flipIndex++;
      }
    } else {
      // Fixed number of coins - generate all flips at once
      for (let i = 0; i < coinCount; i++) {
        const result = this.coinFlipResolver.generateCoinFlip(
          match.id,
          gameState.turnNumber,
          actionId,
          i,
        );
        updatedCoinFlipState = updatedCoinFlipState.withResult(result);
        results.push({
          flipIndex: result.flipIndex,
          result: result.result,
        });
      }
    }

    // Handle STATUS_CHECK context (sleep wake-up, confusion)
    if (updatedCoinFlipState.context === CoinFlipContext.STATUS_CHECK) {
      return await this.handleStatusCheckCoinFlip(
        dto,
        match,
        gameState,
        playerIdentifier,
        updatedCoinFlipState,
        results,
      );
    }

    // For ATTACK context, the coin flip generation is done
    // Attack execution logic is complex and will be handled in Phase 5 (ATTACK handler)
    // For now, update state and return - attack execution continues in use case
    // TODO: Extract ATTACK context coin flip + attack execution to AttackExecutionService in Phase 5
    const updatedGameState = gameState.withCoinFlipState(updatedCoinFlipState);
    match.updateGameState(updatedGameState);
    return await this.matchRepository.save(match);
  }

  /**
   * Handle STATUS_CHECK coin flip (sleep wake-up, confusion)
   */
  private async handleStatusCheckCoinFlip(
    dto: ExecuteActionDto,
    match: Match,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    coinFlipState: CoinFlipState,
    results: any[],
  ): Promise<Match> {
    if (
      coinFlipState.statusEffect === 'ASLEEP' &&
      coinFlipState.pokemonInstanceId
    ) {
      // Sleep wake-up coin flip
      const pokemonInstanceId = coinFlipState.pokemonInstanceId;
      const playerState = gameState.getPlayerState(playerIdentifier);
      const opponentState = gameState.getOpponentState(playerIdentifier);

      // Find the asleep Pokemon
      let asleepPokemon: any | null = null;
      let isActive = false;
      let isOpponent = false;

      if (playerState.activePokemon?.instanceId === pokemonInstanceId) {
        asleepPokemon = playerState.activePokemon;
        isActive = true;
      } else if (
        opponentState.activePokemon?.instanceId === pokemonInstanceId
      ) {
        asleepPokemon = opponentState.activePokemon;
        isActive = true;
        isOpponent = true;
      } else {
        asleepPokemon =
          playerState.bench.find(
            (p) => p.instanceId === pokemonInstanceId,
          ) || null;
        if (!asleepPokemon) {
          asleepPokemon =
            opponentState.bench.find(
              (p) => p.instanceId === pokemonInstanceId,
            ) || null;
          isOpponent = true;
        }
      }

      if (
        !asleepPokemon ||
        !asleepPokemon.hasStatusEffect(StatusEffect.ASLEEP)
      ) {
        throw new BadRequestException(
          'Pokemon is not asleep or not found',
        );
      }

      // Check if coin flip succeeded (heads = wake up)
      const hasHeads = coinFlipState.results.some((r) => r.isHeads());

      let updatedPokemon: any;
      if (hasHeads) {
        // Wake up - clear sleep status
        updatedPokemon = asleepPokemon.withStatusEffect(StatusEffect.NONE);
      } else {
        // Stay asleep - keep status
        updatedPokemon = asleepPokemon;
      }

      // Update game state
      let updatedGameState = gameState;
      if (isActive) {
        if (isOpponent) {
          updatedGameState = updatedGameState.withPlayer2State(
            opponentState.withActivePokemon(updatedPokemon),
          );
        } else {
          updatedGameState = updatedGameState.withPlayer1State(
            playerState.withActivePokemon(updatedPokemon),
          );
        }
      } else {
        // Bench Pokemon
        if (isOpponent) {
          const updatedBench = opponentState.bench.map((p) =>
            p.instanceId === pokemonInstanceId ? updatedPokemon : p,
          );
          updatedGameState = updatedGameState.withPlayer2State(
            opponentState.withBench(updatedBench),
          );
        } else {
          const updatedBench = playerState.bench.map((p) =>
            p.instanceId === pokemonInstanceId ? updatedPokemon : p,
          );
          updatedGameState = updatedGameState.withPlayer1State(
            playerState.withBench(updatedBench),
          );
        }
      }

      // Clear coin flip state
      const finalGameState = updatedGameState
        .withCoinFlipState(null)
        .withPhase(TurnPhase.DRAW); // Return to DRAW phase

      const actionSummary = new ActionSummary(
        uuidv4(),
        playerIdentifier,
        PlayerActionType.GENERATE_COIN_FLIP,
        new Date(),
        {
          context: 'STATUS_CHECK',
          statusEffect: 'ASLEEP',
          pokemonInstanceId,
          wokeUp: hasHeads,
        },
      );

      match.updateGameState(finalGameState.withAction(actionSummary));
      return await this.matchRepository.save(match);
    }

    // Confusion handling is complex and involves attack execution
    // For now, delegate back to use case for confusion + attack flow
    // TODO: Extract confusion + attack execution logic in Phase 5
    throw new BadRequestException(
      'Confusion coin flip handling requires attack execution - delegating to use case',
    );
  }
}

