import { Injectable, Inject } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import {
  GameState,
  PlayerGameState,
  CardInstance,
  CoinFlipState,
  CoinFlipConfiguration,
  CoinFlipResult,
} from '../../domain/value-objects';
import {
  PlayerIdentifier,
  TurnPhase,
  StatusEffect,
  CoinFlipStatus,
  CoinFlipContext,
} from '../../domain/enums';
import {
  CoinFlipCountType,
  DamageCalculationType,
} from '../../domain/value-objects/coin-flip-configuration.value-object';
import { Card } from '../../../card/domain/entities';
import { Attack } from '../../../card/domain/value-objects/attack.value-object';
import {
  StatusConditionEffect,
  DamageModifierEffect,
  DiscardEnergyEffect,
} from '../../../card/domain/value-objects/attack-effect.value-object';
import { AttackEffectType } from '../../../card/domain/enums/attack-effect-type.enum';
import { TargetType } from '../../../card/domain/enums/target-type.enum';
import { ConditionType } from '../../../card/domain/enums/condition-type.enum';
import { IGetCardByIdUseCase } from '../../../card/application/ports/card-use-cases.interface';
import { AttackCoinFlipParserService } from '../../domain/services/attack/coin-flip-detection/attack-coin-flip-parser.service';
import { AttackEnergyValidatorService } from '../../domain/services/attack/energy-requirements/attack-energy-validator.service';
import { CoinFlipResolverService } from '../../domain/services/coin-flip/coin-flip-resolver.service';
import { AttackExecutionResult } from '../../domain/services/attack/interfaces/attack-execution-result.interface';
import { AttackEnergyCostService } from '../../domain/services/attack/energy-costs/attack-energy-cost.service';
import { AttackDamageCalculationService } from '../../domain/services/attack/attack-damage-calculation.service';
import { AttackStatusEffectService } from '../../domain/services/attack/status-effects/attack-status-effect.service';
import { AttackDamageApplicationService } from '../../domain/services/attack/damage-application/attack-damage-application.service';
import { AttackKnockoutService } from '../../domain/services/attack/damage-application/attack-knockout.service';
import { v4 as uuidv4 } from 'uuid';

export interface ExecuteAttackParams {
  attackIndex: number;
  gameState: GameState;
  playerIdentifier: PlayerIdentifier;
  attackerCard: Card;
  attack: Attack;
  cardsMap: Map<string, Card>;
  getCardEntity: (cardId: string) => Promise<Card>;
  getCardHp: (cardId: string) => Promise<number>;
  calculateMinusDamageReduction: (
    damage: number,
    attack: Attack,
    attackText: string,
    attackerName: string,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
  ) => number;
  calculatePlusDamageBonus: (
    attack: Attack,
    attackerName: string,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
    attackText: string,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
  ) => Promise<number>;
  evaluateEffectConditions: (
    conditions: any[],
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
    coinFlipResults?: CoinFlipResult[],
  ) => Promise<boolean>;
  parseSelfDamage: (attackText: string, attackerName: string) => number;
  parseBenchDamage: (attackText: string) => number;
  parseStatusEffectFromAttackText: (
    attackText: string,
  ) => StatusEffect | null;
  validateEnergySelection: (
    selectedEnergyIds: string[],
    discardEffect: DiscardEnergyEffect,
    pokemon: CardInstance,
  ) => Promise<string | null>;
  applyDiscardEnergyEffects: (
    discardEffects: DiscardEnergyEffect[],
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
  ) => Promise<{
    updatedPlayerState: PlayerGameState;
    updatedOpponentState: PlayerGameState;
  }>;
  selectedEnergyIds?: string[]; // For energy discard costs
}

@Injectable()
export class AttackExecutionService {
  constructor(
    @Inject(IGetCardByIdUseCase)
    private readonly getCardByIdUseCase: IGetCardByIdUseCase,
    private readonly attackCoinFlipParser: AttackCoinFlipParserService,
    private readonly attackEnergyValidator: AttackEnergyValidatorService,
    private readonly attackEnergyCost: AttackEnergyCostService,
    private readonly attackDamageCalculation: AttackDamageCalculationService,
    private readonly attackStatusEffect: AttackStatusEffectService,
    private readonly attackDamageApplication: AttackDamageApplicationService,
    private readonly attackKnockout: AttackKnockoutService,
  ) {}

  /**
   * Check if attack requires a coin flip before execution
   */
  checkCoinFlipRequired(
    attack: Attack,
    matchId: string,
    gameState: GameState,
    attackIndex: number,
  ): CoinFlipState | null {
    const coinFlipConfig =
      this.attackCoinFlipParser.parseCoinFlipFromAttack(
        attack.text,
        attack.damage,
      );

    if (!coinFlipConfig) {
      return null;
    }

    // Use deterministic actionId for reproducible coin flips
    const actionId = `${matchId}-turn${gameState.turnNumber}-action${gameState.actionHistory.length}`;
    return new CoinFlipState(
      CoinFlipStatus.READY_TO_FLIP,
      CoinFlipContext.ATTACK,
      coinFlipConfig,
      [],
      attackIndex,
      undefined,
      undefined,
      actionId,
    );
  }

  /**
   * Execute attack with all damage calculation, status effects, and knockout handling
   */
  async executeAttack(
    params: ExecuteAttackParams,
  ): Promise<AttackExecutionResult> {
    const {
      attackIndex,
      gameState,
      playerIdentifier,
      attackerCard,
      attack,
      cardsMap,
      getCardEntity,
      getCardHp,
      calculateMinusDamageReduction,
      calculatePlusDamageBonus,
      evaluateEffectConditions,
      parseSelfDamage,
      parseBenchDamage,
      parseStatusEffectFromAttackText,
      validateEnergySelection,
      applyDiscardEnergyEffects,
      selectedEnergyIds = [],
    } = params;

    const playerState = gameState.getPlayerState(playerIdentifier);
    const opponentState = gameState.getOpponentState(playerIdentifier);

    if (!playerState.activePokemon) {
      throw new BadRequestException('No active Pokemon to attack with');
    }
    if (!opponentState.activePokemon) {
      throw new BadRequestException('No opponent active Pokemon to attack');
    }

    // Validate energy requirements
    const attachedEnergyCardIds = playerState.activePokemon.attachedEnergy;
    const attachedEnergyCards = attachedEnergyCardIds
      .map((cardId) => cardsMap.get(cardId))
      .filter((card): card is Card => card !== undefined);

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

    // Handle energy discard as cost (before attack executes)
    const energyCostResult = await this.attackEnergyCost.processEnergyCost({
      gameState,
      playerIdentifier,
      attack,
      selectedEnergyIds,
      validateEnergySelection,
    });
    let updatedPlayerState = energyCostResult.updatedPlayerState;
    let updatedOpponentState = opponentState;
    let currentGameState = energyCostResult.updatedGameState;

    // Calculate final damage
    const baseDamage = parseInt(attack.damage || '0', 10);

    // Get defender card
    if (!updatedOpponentState.activePokemon) {
      throw new BadRequestException('Opponent active Pokemon is null');
    }
    let defenderCard = cardsMap.get(updatedOpponentState.activePokemon.cardId);
    if (!defenderCard) {
      defenderCard = await getCardEntity(
        updatedOpponentState.activePokemon.cardId,
      );
    }

    // Calculate final damage using damage calculation service
    const finalDamage = await this.attackDamageCalculation.calculateFinalDamage(
      {
        baseDamage,
        attack,
        attackerCard,
        defenderCard,
        gameState: currentGameState,
        playerIdentifier,
        playerState: updatedPlayerState,
        opponentState: updatedOpponentState,
        calculateMinusDamageReduction,
        calculatePlusDamageBonus,
        evaluateEffectConditions,
      },
    );

    // Parse self-damage and bench damage
    const attackText = attack.text || '';
    const selfDamage = parseSelfDamage(attackText, attackerCard.name);
    const benchDamage = parseBenchDamage(attackText);

    // Apply damage to opponent's active Pokemon
    if (!updatedOpponentState.activePokemon) {
      throw new BadRequestException('Opponent active Pokemon is null');
    }
    let updatedOpponentActive = this.attackDamageApplication.applyActiveDamage({
      pokemon: updatedOpponentState.activePokemon,
      damage: finalDamage,
    });

    // Track coin flip results
    let attackCoinFlipResults: CoinFlipResult[] = [];
    if (
      gameState.coinFlipState?.context === CoinFlipContext.ATTACK &&
      gameState.coinFlipState.results.length > 0
    ) {
      attackCoinFlipResults = gameState.coinFlipState.results;
    }

    // Apply status effects from attack
    const statusEffectResult = await this.attackStatusEffect.applyStatusEffects({
      attack,
      attackText,
      gameState: currentGameState,
      playerIdentifier,
      playerState: updatedPlayerState,
      opponentState: updatedOpponentState,
      targetPokemon: updatedOpponentActive,
      evaluateEffectConditions,
      parseStatusEffectFromAttackText,
    });
    updatedOpponentActive = statusEffectResult.updatedPokemon;
    const attackStatusEffectApplied = statusEffectResult.statusApplied;
    const attackAppliedStatus = statusEffectResult.appliedStatus;

    // Check for knockout
    const isKnockedOut = updatedOpponentActive.currentHp === 0;

    // Apply self-damage if needed
    if (selfDamage > 0 && updatedPlayerState.activePokemon) {
      const selfDamageResult = this.attackDamageApplication.applySelfDamage({
        attackerPokemon: updatedPlayerState.activePokemon,
        selfDamage,
      });

      if (selfDamageResult.isKnockedOut) {
        const attackerCardsToDiscard =
          updatedPlayerState.activePokemon.getAllCardsToDiscard();
        const attackerDiscardPile = [
          ...updatedPlayerState.discardPile,
          ...attackerCardsToDiscard,
        ];
        updatedPlayerState = updatedPlayerState
          .withActivePokemon(null)
          .withDiscardPile(attackerDiscardPile);
      } else if (selfDamageResult.updatedPokemon) {
        updatedPlayerState = updatedPlayerState.withActivePokemon(
          selfDamageResult.updatedPokemon,
        );
      }
    }

    // Apply bench damage if needed
    if (benchDamage > 0 && updatedOpponentState.bench.length > 0) {
      const benchDamageResult =
        this.attackDamageApplication.applyBenchDamage({
          bench: updatedOpponentState.bench,
          benchDamage,
        });

      if (benchDamageResult.knockedOutBench.length > 0) {
        updatedOpponentState = this.attackKnockout.handleBenchKnockout(
          benchDamageResult.knockedOutBench,
          updatedOpponentState,
        );
      }
      updatedOpponentState = updatedOpponentState.withBench(
        benchDamageResult.updatedBench,
      );
    }

    // Update opponent state with damaged/knocked out active Pokemon
    if (isKnockedOut) {
      const knockoutResult = this.attackKnockout.handleActiveKnockout({
        pokemon: updatedOpponentActive,
        playerState: updatedOpponentState,
      });
      updatedOpponentState = knockoutResult.updatedState;
    } else {
      updatedOpponentState = updatedOpponentState.withActivePokemon(
        updatedOpponentActive,
      );
    }

    // Apply discard energy effects (after damage, as effects)
    const discardEnergyEffects = attack.hasEffects()
      ? attack
          .getEffectsByType(AttackEffectType.DISCARD_ENERGY)
          .filter(
            (effect) =>
              (effect as DiscardEnergyEffect).target !== TargetType.SELF,
          )
      : [];

    if (discardEnergyEffects.length > 0) {
      const result = await applyDiscardEnergyEffects(
        discardEnergyEffects as DiscardEnergyEffect[],
        currentGameState,
        playerIdentifier,
        updatedPlayerState,
        updatedOpponentState,
      );
      updatedPlayerState = result.updatedPlayerState;
      updatedOpponentState = result.updatedOpponentState;
    }

    // Build action data
    const actionData: any = {
      attackIndex,
      damageDealt: finalDamage,
      isKnockedOut,
      statusEffectApplied: attackStatusEffectApplied,
      coinFlipResults: attackCoinFlipResults,
    };

    if (attackStatusEffectApplied && attackAppliedStatus) {
      actionData.appliedStatus = attackAppliedStatus;
    }

    if (selectedEnergyIds.length > 0) {
      actionData.selectedEnergyIds = selectedEnergyIds;
    }

    return {
      updatedPlayerState,
      updatedOpponentState,
      finalDamage,
      isKnockedOut,
      statusEffectApplied: attackStatusEffectApplied,
      appliedStatus: attackAppliedStatus || undefined,
      coinFlipResults: attackCoinFlipResults,
      actionData,
    };
  }

}

