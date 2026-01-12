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
  MatchState,
} from '../../../domain';
import { Card } from '../../../../card/domain/entities';
import { IMatchRepository } from '../../../domain/repositories';
import {
  MatchStateMachineService,
  CoinFlipResolverService,
  AttackDamageCalculatorService,
  AttackTextParserService,
  EffectConditionEvaluatorService,
} from '../../../domain/services';
import { IGetCardByIdUseCase } from '../../../../card/application/ports/card-use-cases.interface';
import { CoinFlipStatus } from '../../../domain/enums/coin-flip-status.enum';
import { CoinFlipContext } from '../../../domain/enums/coin-flip-context.enum';
import {
  CoinFlipCountType,
  CoinFlipState,
  PlayerGameState,
  CardInstance,
  CoinFlipResult,
} from '../../../domain/value-objects';
import { CoinFlipExecutionService } from '../../services/coin-flip-execution.service';
import { CardHelperService } from '../../services/card-helper.service';
import { Attack } from '../../../../card/domain/value-objects/attack.value-object';
import { DiscardEnergyEffect } from '../../../../card/domain/value-objects/attack-effect.value-object';
import { TargetType } from '../../../../card/domain/enums/target-type.enum';
import { ActionHandlerFactory } from '../action-handler-factory';
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
    private readonly coinFlipExecutionService: CoinFlipExecutionService,
    private readonly cardHelper: CardHelperService,
    private readonly attackDamageCalculator: AttackDamageCalculatorService,
    private readonly attackTextParser: AttackTextParserService,
    private readonly effectConditionEvaluator: EffectConditionEvaluatorService,
    private readonly actionHandlerFactory: ActionHandlerFactory,
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
    // Use CoinFlipExecutionService to generate coin flip
    const result = await this.coinFlipExecutionService.generateCoinFlip({
      gameState,
      playerIdentifier,
      matchId: match.id,
      cardsMap,
      getCardEntity: (cardId: string) =>
        this.cardHelper.getCardEntity(cardId, cardsMap),
      getCardHp: (cardId: string) =>
        this.cardHelper.getCardHp(cardId, cardsMap),
      calculateMinusDamageReduction: (
        damage: number,
        attack: Attack,
        attackText: string,
        attackerName: string,
        playerState: PlayerGameState,
        opponentState: PlayerGameState,
      ) =>
        this.attackDamageCalculator.calculateMinusDamageReduction(
          damage,
          attack,
          attackText,
          attackerName,
          playerState,
          opponentState,
        ),
      calculatePlusDamageBonus: (
        attack: Attack,
        attackerName: string,
        playerState: PlayerGameState,
        opponentState: PlayerGameState,
        attackText: string,
        gameState: GameState,
        playerIdentifier: PlayerIdentifier,
      ) =>
        this.attackDamageCalculator.calculatePlusDamageBonus(
          attack,
          attackerName,
          playerState,
          opponentState,
          attackText,
          gameState,
          playerIdentifier,
          (cardId: string) => this.cardHelper.getCardEntity(cardId, cardsMap),
        ),
      evaluateEffectConditions: (
        conditions: any[],
        gameState: GameState,
        playerIdentifier: PlayerIdentifier,
        playerState: PlayerGameState,
        opponentState: PlayerGameState,
        coinFlipResults?: CoinFlipResult[],
      ) =>
        this.effectConditionEvaluator.evaluateEffectConditions(
          conditions,
          gameState,
          playerIdentifier,
          playerState,
          opponentState,
          coinFlipResults,
          (cardId: string) => this.cardHelper.getCardEntity(cardId, cardsMap),
        ),
      parseSelfDamage: (attackText: string, attackerName: string) =>
        this.attackTextParser.parseSelfDamage(attackText, attackerName),
      parseBenchDamage: (attackText: string) =>
        this.attackTextParser.parseBenchDamage(attackText),
      parseStatusEffectFromAttackText: (attackText: string) =>
        this.attackTextParser.parseStatusEffectFromAttackText(
          attackText,
          false,
        ),
      validateEnergySelection: async (
        selectedEnergyIds: string[],
        discardEffect: DiscardEnergyEffect,
        pokemon: CardInstance,
      ) => {
        // Check that all selected energy IDs are actually attached
        for (const energyId of selectedEnergyIds) {
          if (!pokemon.attachedEnergy.includes(energyId)) {
            return `Energy card ${energyId} is not attached to this Pokemon`;
          }
        }

        // Check amount
        if (discardEffect.amount !== 'all') {
          if (selectedEnergyIds.length !== discardEffect.amount) {
            return `Must select exactly ${discardEffect.amount} energy card(s), but ${selectedEnergyIds.length} were selected`;
          }
        }

        // Check energy type if specified in effect
        if (discardEffect.energyType) {
          for (const energyId of selectedEnergyIds) {
            try {
              const energyCard = await this.cardHelper.getCardEntity(
                energyId,
                cardsMap,
              );
              if (energyCard.energyType !== discardEffect.energyType) {
                return `Selected energy card ${energyId} is not ${discardEffect.energyType} Energy`;
              }
            } catch {
              return `Could not validate energy card ${energyId}`;
            }
          }
        }

        return null;
      },
      applyDiscardEnergyEffects: async (
        discardEffects: DiscardEnergyEffect[],
        gameState: GameState,
        playerIdentifier: PlayerIdentifier,
        playerState: PlayerGameState,
        opponentState: PlayerGameState,
      ) => {
        const updatedPlayerState = playerState;
        let updatedOpponentState = opponentState;

        for (const discardEffect of discardEffects) {
          const conditionsMet =
            await this.effectConditionEvaluator.evaluateEffectConditions(
              discardEffect.requiredConditions || [],
              gameState,
              playerIdentifier,
              playerState,
              opponentState,
              undefined,
              (cardId: string) =>
                this.cardHelper.getCardEntity(cardId, cardsMap),
            );

          if (conditionsMet) {
            if (
              discardEffect.target === TargetType.DEFENDING &&
              updatedOpponentState.activePokemon
            ) {
              // Simple implementation: discard first matching energy
              const energyToDiscard: string[] = [];
              const attachedEnergy =
                updatedOpponentState.activePokemon.attachedEnergy;

              if (discardEffect.amount === 'all') {
                if (discardEffect.energyType) {
                  for (const energyId of attachedEnergy) {
                    const energyCard = await this.cardHelper.getCardEntity(
                      energyId,
                      cardsMap,
                    );
                    if (energyCard.energyType === discardEffect.energyType) {
                      energyToDiscard.push(energyId);
                    }
                  }
                } else {
                  energyToDiscard.push(...attachedEnergy);
                }
              } else {
                const amount = discardEffect.amount;
                let count = 0;
                for (const energyId of attachedEnergy) {
                  if (count >= amount) break;
                  if (discardEffect.energyType) {
                    const energyCard = await this.cardHelper.getCardEntity(
                      energyId,
                      cardsMap,
                    );
                    if (energyCard.energyType === discardEffect.energyType) {
                      energyToDiscard.push(energyId);
                      count++;
                    }
                  } else {
                    energyToDiscard.push(energyId);
                    count++;
                  }
                }
              }

              if (energyToDiscard.length > 0) {
                const updatedAttachedEnergy = attachedEnergy.filter(
                  (energyId) => !energyToDiscard.includes(energyId),
                );
                const updatedDefender =
                  updatedOpponentState.activePokemon.withAttachedEnergy(
                    updatedAttachedEnergy,
                  );
                const updatedDiscardPile = [
                  ...updatedOpponentState.discardPile,
                  ...energyToDiscard,
                ];
                updatedOpponentState = updatedOpponentState
                  .withActivePokemon(updatedDefender)
                  .withDiscardPile(updatedDiscardPile);
              }
            }
          }
        }

        return { updatedPlayerState, updatedOpponentState };
      },
    });

    // Handle ATTACK context - check if attack should be resolved
    if (
      result.updatedGameState.coinFlipState?.context ===
        CoinFlipContext.ATTACK &&
      result.shouldResolveAttack
    ) {
      // Update match state first with coin flip results
      match.updateGameState(result.updatedGameState);
      await this.matchRepository.save(match);

      // Now trigger attack execution by re-invoking ATTACK handler
      // The AttackActionHandler will detect the completed coin flip and execute
      const attackHandler = this.actionHandlerFactory.getHandler(
        PlayerActionType.ATTACK,
      );

      // Create a new DTO for the attack with the attack index from coin flip state
      const coinFlipState = result.updatedGameState.coinFlipState;
      if (!coinFlipState || coinFlipState.attackIndex === undefined) {
        throw new BadRequestException(
          'Attack index not found in coin flip state',
        );
      }

      // For ATTACK context, use currentPlayer (the attacker) instead of playerIdentifier (who approved)
      const attackingPlayer =
        coinFlipState.context === CoinFlipContext.ATTACK
          ? result.updatedGameState.currentPlayer
          : playerIdentifier;

      const attackDto: ExecuteActionDto = {
        matchId: match.id,
        playerId: dto.playerId,
        actionType: PlayerActionType.ATTACK,
        actionData: {
          attackIndex: coinFlipState.attackIndex,
        },
      };

      // Use result.updatedGameState which has the completed coin flip state
      // Update match's game state to match before calling attack handler
      match.updateGameState(result.updatedGameState);
      await this.matchRepository.save(match);

      // Store original match state before attack handler execution
      const originalMatchState = match.state;

      // Execute attack handler - this will update the match with attack results
      const attackResult = await attackHandler.execute(
        attackDto,
        match,
        result.updatedGameState,
        attackingPlayer,
        cardsMap,
      );

      // When attack handler is called internally from coin flip flow,
      // we need to preserve PLAYER_TURN state to allow the flow to continue
      // Only allow MATCH_ENDED if it was already ended before the attack
      if (
        attackResult.state === MatchState.MATCH_ENDED &&
        originalMatchState === MatchState.PLAYER_TURN
      ) {
        // Restore PLAYER_TURN state - the match ending will be handled by the normal flow
        // This allows the coin flip flow to complete properly
        Object.defineProperty(attackResult, '_state', {
          value: MatchState.PLAYER_TURN,
          writable: true,
          configurable: true,
        });
      } else if (
        attackResult.state !== MatchState.PLAYER_TURN &&
        attackResult.state !== MatchState.MATCH_ENDED &&
        attackResult.state !== MatchState.BETWEEN_TURNS
      ) {
        // If match state changed unexpectedly, restore it to PLAYER_TURN
        Object.defineProperty(attackResult, '_state', {
          value: MatchState.PLAYER_TURN,
          writable: true,
          configurable: true,
        });
      }

      return attackResult;
    }

    // Handle STATUS_CHECK context (sleep wake-up, confusion)
    if (
      result.updatedGameState.coinFlipState?.context ===
      CoinFlipContext.STATUS_CHECK
    ) {
      return await this.handleStatusCheckCoinFlip(
        dto,
        match,
        result.updatedGameState,
        playerIdentifier,
        result.updatedGameState.coinFlipState,
        result.updatedGameState.coinFlipState.results.map((r) => ({
          flipIndex: r.flipIndex,
          result: r.result,
        })),
      );
    }

    // Update match with result (for non-ATTACK contexts or when shouldResolveAttack is false)
    match.updateGameState(result.updatedGameState);
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
      coinFlipState.statusEffect === StatusEffect.ASLEEP &&
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
          playerState.bench.find((p) => p.instanceId === pokemonInstanceId) ||
          null;
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
        throw new BadRequestException('Pokemon is not asleep or not found');
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
          context: CoinFlipContext.STATUS_CHECK,
          statusEffect: StatusEffect.ASLEEP,
          pokemonInstanceId,
          wokeUp: hasHeads,
        },
      );

      match.updateGameState(finalGameState.withAction(actionSummary));
      return await this.matchRepository.save(match);
    }

    // Confusion handling: if tails, apply self-damage (handled in AttackActionHandler)
    // If heads, attack can proceed (AttackActionHandler will handle it)
    // For now, just clear the coin flip state and let AttackActionHandler handle the result
    const hasHeads = coinFlipState.results.some((r) => r.isHeads());

    if (!hasHeads) {
      // Tails - confusion failed, but self-damage is handled in AttackActionHandler
      // Just clear coin flip state here
      const finalGameState = gameState
        .withCoinFlipState(null)
        .withPhase(TurnPhase.MAIN_PHASE);

      const actionSummary = new ActionSummary(
        uuidv4(),
        playerIdentifier,
        PlayerActionType.GENERATE_COIN_FLIP,
        new Date(),
        {
          context: CoinFlipContext.STATUS_CHECK,
          statusEffect: StatusEffect.CONFUSED,
          pokemonInstanceId: coinFlipState.pokemonInstanceId,
          confusionFailed: true,
        },
      );

      match.updateGameState(finalGameState.withAction(actionSummary));
      return await this.matchRepository.save(match);
    }

    // Heads - confusion passed, clear coin flip state
    // AttackActionHandler will handle the actual attack
    const finalGameState = gameState
      .withCoinFlipState(null)
      .withPhase(TurnPhase.MAIN_PHASE);

    const actionSummary = new ActionSummary(
      uuidv4(),
      playerIdentifier,
      PlayerActionType.GENERATE_COIN_FLIP,
      new Date(),
      {
        context: CoinFlipContext.STATUS_CHECK,
        statusEffect: StatusEffect.CONFUSED,
        pokemonInstanceId: coinFlipState.pokemonInstanceId,
        confusionPassed: true,
      },
    );

    match.updateGameState(finalGameState.withAction(actionSummary));
    return await this.matchRepository.save(match);
  }
}
