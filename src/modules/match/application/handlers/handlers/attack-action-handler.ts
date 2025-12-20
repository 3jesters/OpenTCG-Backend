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
  MatchResult,
  WinCondition,
} from '../../../domain';
import {
  PlayerGameState,
  CardInstance,
  CoinFlipResult,
} from '../../../domain/value-objects';
import { Card } from '../../../../card/domain/entities';
import { IMatchRepository } from '../../../domain/repositories';
import {
  MatchStateMachineService,
  AttackEnergyValidatorService,
  CoinFlipResolverService,
  AttackCoinFlipParserService,
  AttackDamageCalculatorService,
  AttackTextParserService,
  EffectConditionEvaluatorService,
} from '../../../domain/services';
import { IGetCardByIdUseCase } from '../../../../card/application/ports/card-use-cases.interface';
import { CoinFlipStatus } from '../../../domain/enums/coin-flip-status.enum';
import { CoinFlipContext } from '../../../domain/enums/coin-flip-context.enum';
import { AttackExecutionService } from '../../services/attack-execution.service';
import { CardHelperService } from '../../services/card-helper.service';
import { Attack } from '../../../../card/domain/value-objects/attack.value-object';
import {
  DiscardEnergyEffect,
  StatusConditionEffect,
} from '../../../../card/domain/value-objects/attack-effect.value-object';
import { AttackEffectType } from '../../../../card/domain/enums/attack-effect-type.enum';
import { TargetType } from '../../../../card/domain/enums/target-type.enum';
import { v4 as uuidv4 } from 'uuid';

/**
 * Attack Action Handler
 * Handles Pokemon attacks during MAIN_PHASE or ATTACK phase
 * 
 * Note: This is a simplified handler. The full ATTACK implementation is ~2900 lines
 * and involves complex coin flip logic, damage calculation, status effects, etc.
 * For now, this handler extracts the core validation and basic attack flow.
 * Complex attack execution logic (coin flips, damage modifiers, etc.) can be
 * extracted to AttackExecutionService in a future refactoring.
 */
@Injectable()
export class AttackActionHandler
  extends BaseActionHandler
  implements IActionHandler
{
  constructor(
    @Inject(IMatchRepository)
    protected readonly matchRepository: IMatchRepository,
    protected readonly stateMachineService: MatchStateMachineService,
    @Inject(IGetCardByIdUseCase)
    protected readonly getCardByIdUseCase: IGetCardByIdUseCase,
    private readonly attackEnergyValidator: AttackEnergyValidatorService,
    private readonly coinFlipResolver: CoinFlipResolverService,
    private readonly attackCoinFlipParser: AttackCoinFlipParserService,
    private readonly attackExecutionService: AttackExecutionService,
    private readonly cardHelper: CardHelperService,
    private readonly attackDamageCalculator: AttackDamageCalculatorService,
    private readonly attackTextParser: AttackTextParserService,
    private readonly effectConditionEvaluator: EffectConditionEvaluatorService,
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
    // Allow attack from MAIN_PHASE or ATTACK phase
    if (
      gameState.phase !== TurnPhase.MAIN_PHASE &&
      gameState.phase !== TurnPhase.ATTACK
    ) {
      throw new BadRequestException(
        `Cannot attack in phase ${gameState.phase}. Must be MAIN_PHASE or ATTACK`,
      );
    }

    const attackIndex = (dto.actionData as any)?.attackIndex;
    if (attackIndex === undefined) {
      throw new BadRequestException('attackIndex is required');
    }

    const playerState = gameState.getPlayerState(playerIdentifier);
    const opponentState = gameState.getOpponentState(playerIdentifier);

    if (!playerState.activePokemon) {
      throw new BadRequestException('No active Pokemon to attack with');
    }
    if (!opponentState.activePokemon) {
      throw new BadRequestException('No opponent active Pokemon to attack');
    }

    // Check status effects that block attacks
    const activePokemon = playerState.activePokemon;

    // Check if Pokemon is asleep
    if (activePokemon.hasStatusEffect(StatusEffect.ASLEEP)) {
      // Check if there's a coin flip state for wake-up
      if (
        !gameState.coinFlipState ||
        gameState.coinFlipState.context !== CoinFlipContext.STATUS_CHECK ||
        gameState.coinFlipState.statusEffect !== StatusEffect.ASLEEP ||
        gameState.coinFlipState.pokemonInstanceId !== activePokemon.instanceId
      ) {
        throw new BadRequestException(
          'Cannot attack while Asleep. Flip a coin to wake up first.',
        );
      }
      // If coin flip exists but not resolved, must resolve it first
      if (gameState.coinFlipState.status === CoinFlipStatus.READY_TO_FLIP) {
        throw new BadRequestException(
          'Must resolve sleep coin flip before attacking.',
        );
      }
      // If coin flip was tails (still asleep), block attack
      if (
        gameState.coinFlipState.results.length > 0 &&
        gameState.coinFlipState.results.every((r) => r.isTails())
      ) {
        throw new BadRequestException(
          'Cannot attack while Asleep. Pokemon did not wake up.',
        );
      }
    }

    // Check if Pokemon is paralyzed
    if (activePokemon.hasStatusEffect(StatusEffect.PARALYZED)) {
      throw new BadRequestException('Cannot attack while Paralyzed.');
    }

    // Check if Pokemon is confused - require coin flip before attack
    if (activePokemon.hasStatusEffect(StatusEffect.CONFUSED)) {
      // Check if coin flip state exists for confusion
      if (
        !gameState.coinFlipState ||
        gameState.coinFlipState.context !== CoinFlipContext.STATUS_CHECK ||
        gameState.coinFlipState.statusEffect !== StatusEffect.CONFUSED ||
        gameState.coinFlipState.pokemonInstanceId !== activePokemon.instanceId
      ) {
        // Confusion coin flip must be created first via GENERATE_COIN_FLIP
        throw new BadRequestException(
          'Cannot attack while Confused. Flip a coin to check confusion first.',
        );
      }

      // If coin flip exists but not resolved, must resolve it first
      if (gameState.coinFlipState.status === CoinFlipStatus.READY_TO_FLIP) {
        throw new BadRequestException(
          'Must resolve confusion coin flip before attacking.',
        );
      }

      // Check coin flip result - if tails, apply self-damage and block attack
      if (gameState.coinFlipState.results.length > 0) {
        const allTails = gameState.coinFlipState.results.every((r) =>
          r.isTails(),
        );
        if (allTails) {
          // Apply 30 self-damage
          const selfDamage = 30;
          const newHp = Math.max(0, activePokemon.currentHp - selfDamage);
          const updatedActive = activePokemon.withHp(newHp);
          const isKnockedOut = newHp === 0;

          let updatedPlayerState = playerState.withActivePokemon(updatedActive);

          // If knocked out, move to discard
          if (isKnockedOut) {
            const cardsToDiscard = activePokemon.getAllCardsToDiscard();
            const discardPile = [
              ...playerState.discardPile,
              ...cardsToDiscard,
            ];
            updatedPlayerState = updatedPlayerState
              .withActivePokemon(null)
              .withDiscardPile(discardPile);
          }

          const updatedGameState = gameState
            .withPlayer1State(
              playerIdentifier === PlayerIdentifier.PLAYER1
                ? updatedPlayerState
                : gameState.player1State,
            )
            .withPlayer2State(
              playerIdentifier === PlayerIdentifier.PLAYER2
                ? updatedPlayerState
                : gameState.player2State,
            )
            .withCoinFlipState(null); // Clear coin flip state

          const actionSummary = new ActionSummary(
            uuidv4(),
            playerIdentifier,
            PlayerActionType.ATTACK,
            new Date(),
            {
              attackIndex,
              confusionFailed: true,
              selfDamage,
              isKnockedOut,
            },
          );

          match.updateGameState(updatedGameState.withAction(actionSummary));
          return await this.matchRepository.save(match);
        }
        // If heads, continue with attack (clear coin flip state will happen after attack)
      }
    }

    // Load attacker card entity to get Attack objects with effects
    const attackerCardEntity = await this.getCardEntity(
      playerState.activePokemon.cardId,
      cardsMap,
    );
    if (
      !attackerCardEntity.attacks ||
      attackerCardEntity.attacks.length <= attackIndex
    ) {
      throw new BadRequestException(`Invalid attack index: ${attackIndex}`);
    }

    const attack = attackerCardEntity.attacks[attackIndex];

    // Get attacker card from batch-loaded map for type checks
    const attackerCard = await this.getCardEntity(
      playerState.activePokemon.cardId,
      cardsMap,
    );

    // Validate energy requirements for attack
    const attachedEnergyCardIds =
      playerState.activePokemon.attachedEnergy || [];
    const attachedEnergyCards = attachedEnergyCardIds
      .map((cardId) => cardsMap.get(cardId))
      .filter((card): card is Card => card !== undefined);

    // Convert Card entities to energy card data format
    const energyCardData = attachedEnergyCards.map((card) => ({
      cardType: card.cardType,
      energyType: card.energyType,
      energyProvision: card.energyProvision,
    }));

    const energyValidation =
      this.attackEnergyValidator.validateEnergyRequirements(
        attack,
        energyCardData,
      );

    if (!energyValidation.isValid) {
      throw new BadRequestException(
        energyValidation.error || 'Insufficient energy to use this attack',
      );
    }

    // Check if attack requires coin flip before execution
    const coinFlipState = this.attackExecutionService.checkCoinFlipRequired(
      attack,
      match.id,
      gameState,
      attackIndex,
    );

    // If coin flip is required, create coin flip state and wait for flip
    if (coinFlipState) {
      // Create action summary for attack initiation
      const actionSummary = new ActionSummary(
        coinFlipState.actionId || uuidv4(),
        playerIdentifier,
        PlayerActionType.ATTACK,
        new Date(),
        { attackIndex, coinFlipRequired: true },
      );

      // Update game state with coin flip state (immutable update)
      const updatedGameState = gameState
        .withCoinFlipState(coinFlipState)
        .withAction(actionSummary)
        .withPhase(TurnPhase.ATTACK);

      match.updateGameState(updatedGameState);
      return await this.matchRepository.save(match);
    }

    // No coin flip required - execute attack immediately
    const actionData = dto.actionData as any;
    const selectedEnergyIds = actionData?.selectedEnergyIds || [];

    // Execute attack using AttackExecutionService
    const result = await this.attackExecutionService.executeAttack({
      attackIndex,
      gameState,
      playerIdentifier,
      attackerCard,
      attack,
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
      parseStatusEffectFromAttackText: (attackText: string) => {
        const statusCondition = this.attackTextParser.parseStatusEffectFromAttackText(attackText, false);
        if (!statusCondition) return null;
        // Map StatusConditionEffect to StatusEffect enum
        switch (statusCondition.statusCondition) {
          case StatusEffect.PARALYZED:
          case 'PARALYZED':
            return StatusEffect.PARALYZED;
          case StatusEffect.POISONED:
          case 'POISONED':
            return StatusEffect.POISONED;
          case StatusEffect.BURNED:
          case 'BURNED':
            return StatusEffect.BURNED;
          case StatusEffect.ASLEEP:
          case 'ASLEEP':
            return StatusEffect.ASLEEP;
          case StatusEffect.CONFUSED:
          case 'CONFUSED':
            return StatusEffect.CONFUSED;
          default:
            return null;
        }
      },
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
        let updatedPlayerState = playerState;
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
              (cardId: string) => this.cardHelper.getCardEntity(cardId, cardsMap),
            );

          if (conditionsMet) {
            if (
              discardEffect.target === TargetType.DEFENDING &&
              updatedOpponentState.activePokemon
            ) {
              // Simple implementation: discard first matching energy
              // TODO: Extract to a service for proper energy selection logic
              const energyToDiscard: string[] = [];
              const attachedEnergy =
                updatedOpponentState.activePokemon.attachedEnergy;

              if (discardEffect.amount === 'all') {
                if (discardEffect.energyType) {
                  // Filter by type
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
                // Select specific amount
                const amount = discardEffect.amount as number;
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
      selectedEnergyIds,
    });

    // Reconstruct game state from result
    const updatedGameState =
      playerIdentifier === PlayerIdentifier.PLAYER1
        ? gameState
            .withPlayer1State(result.updatedPlayerState)
            .withPlayer2State(result.updatedOpponentState)
        : gameState
            .withPlayer1State(result.updatedOpponentState)
            .withPlayer2State(result.updatedPlayerState);

    // Clear confusion coin flip state if it exists (attack succeeded)
    let finalGameState = updatedGameState;
    if (
      gameState.coinFlipState?.context === CoinFlipContext.STATUS_CHECK &&
      gameState.coinFlipState.statusEffect === StatusEffect.CONFUSED
    ) {
      finalGameState = finalGameState.withCoinFlipState(null);
    }

    // Transition to END phase after attack
    const nextPhaseGameState = finalGameState.withPhase(TurnPhase.END);

    // Build actionData with coin flip results if applicable
    const actionDataResult: any = {
      attackIndex,
      damage: result.finalDamage,
      isKnockedOut: result.isKnockedOut,
    };

    // Add coin flip results if coin flip was performed
    if (result.coinFlipResults && result.coinFlipResults.length > 0) {
      actionDataResult.coinFlipResults = result.coinFlipResults.map((r) => ({
        flipIndex: r.flipIndex,
        result: r.result, // 'heads' | 'tails'
      }));
      actionDataResult.statusEffectApplied = result.statusEffectApplied;
      if (result.appliedStatus) {
        actionDataResult.statusEffect = result.appliedStatus;
      }
    }

    const actionSummary = new ActionSummary(
      uuidv4(),
      playerIdentifier,
      PlayerActionType.ATTACK,
      new Date(),
      actionDataResult,
    );

    const finalGameStateWithAction =
      nextPhaseGameState.withAction(actionSummary);
    match.updateGameState(finalGameStateWithAction);

    // Check win conditions after attack (e.g., opponent has no Pokemon left)
    const winCheck = this.stateMachineService.checkWinConditions(
      finalGameState.player1State,
      finalGameState.player2State,
    );
    if (winCheck.hasWinner && winCheck.winner) {
      const winnerId =
        winCheck.winner === PlayerIdentifier.PLAYER1
          ? match.player1Id!
          : match.player2Id!;
      match.endMatch(
        winnerId,
        winCheck.winner === PlayerIdentifier.PLAYER1
          ? MatchResult.PLAYER1_WIN
          : MatchResult.PLAYER2_WIN,
        winCheck.winCondition as WinCondition,
      );
    }

    return await this.matchRepository.save(match);
  }
}

