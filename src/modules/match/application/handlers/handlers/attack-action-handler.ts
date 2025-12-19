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
  AttackEnergyValidatorService,
  CoinFlipResolverService,
  AttackCoinFlipParserService,
} from '../../../domain/services';
import { IGetCardByIdUseCase } from '../../../../card/application/ports/card-use-cases.interface';
import { CoinFlipStatus } from '../../../domain/enums/coin-flip-status.enum';
import { CoinFlipContext } from '../../../domain/enums/coin-flip-context.enum';
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
        gameState.coinFlipState.statusEffect !== 'ASLEEP' ||
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
        gameState.coinFlipState.statusEffect !== 'CONFUSED' ||
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

    // ATTACK execution is extremely complex (~2900 lines in use case)
    // It involves:
    // - Coin flip handling (if attack requires coin flips)
    // - Damage calculation with modifiers (+ damage, - damage, etc.)
    // - Weakness/resistance application
    // - Status effect application
    // - Damage prevention/reduction effects
    // - Knockout handling
    // - Prize selection
    // 
    // For now, delegate back to use case for full attack execution
    // TODO: Extract attack execution logic to AttackExecutionService
    throw new BadRequestException(
      'ATTACK handler not yet fully implemented - delegating to use case',
    );
  }
}

