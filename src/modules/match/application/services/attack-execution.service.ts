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
import { AttackCoinFlipParserService } from '../../domain/services/attack-coin-flip-parser.service';
import { AttackEnergyValidatorService } from '../../domain/services/attack-energy-validator.service';
import { AttackExecutionResult } from '../../domain/services/attack-execution-result.interface';
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
    let updatedPlayerState = playerState;
    let updatedOpponentState = opponentState;
    let currentGameState = gameState;

    const discardEnergyCostEffects = attack.hasEffects()
      ? attack
          .getEffectsByType(AttackEffectType.DISCARD_ENERGY)
          .filter(
            (effect) =>
              (effect as DiscardEnergyEffect).target === TargetType.SELF,
          )
      : [];

    if (discardEnergyCostEffects.length > 0) {
      const discardEffect =
        discardEnergyCostEffects[0] as DiscardEnergyEffect;

      if (!selectedEnergyIds || selectedEnergyIds.length === 0) {
        throw new BadRequestException(
          JSON.stringify({
            error: 'ENERGY_SELECTION_REQUIRED',
            message: `This attack requires discarding ${discardEffect.amount === 'all' ? 'all' : discardEffect.amount} ${discardEffect.energyType ? discardEffect.energyType + ' ' : ''}Energy card(s)`,
            requirement: {
              amount: discardEffect.amount,
              energyType: discardEffect.energyType,
              target: 'self',
            },
            availableEnergy: playerState.activePokemon.attachedEnergy,
          }),
        );
      }

      const validationError = await validateEnergySelection(
        selectedEnergyIds,
        discardEffect,
        playerState.activePokemon,
      );
      if (validationError) {
        throw new BadRequestException(validationError);
      }

      // Discard energy BEFORE attack executes (this is a cost)
      const updatedAttachedEnergy = [
        ...playerState.activePokemon.attachedEnergy,
      ];
      for (const energyId of selectedEnergyIds) {
        const energyIndex = updatedAttachedEnergy.indexOf(energyId);
        if (energyIndex === -1) {
          throw new BadRequestException(
            `Energy card ${energyId} is not attached to this Pokemon`,
          );
        }
        updatedAttachedEnergy.splice(energyIndex, 1);
      }

      const updatedAttacker = playerState.activePokemon.withAttachedEnergy(
        updatedAttachedEnergy,
      );
      const updatedDiscardPile = [...playerState.discardPile, ...selectedEnergyIds];
      updatedPlayerState = playerState
        .withActivePokemon(updatedAttacker)
        .withDiscardPile(updatedDiscardPile);

      currentGameState =
        playerIdentifier === PlayerIdentifier.PLAYER1
          ? currentGameState.withPlayer1State(updatedPlayerState)
          : currentGameState.withPlayer2State(updatedPlayerState);
    }

    // Calculate damage
    let damage = parseInt(attack.damage || '0', 10);

    // Apply minus damage reduction
    damage = calculateMinusDamageReduction(
      damage,
      attack,
      attack.text,
      attackerCard.name,
      updatedPlayerState,
      updatedOpponentState,
    );

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

    // Apply damage modifiers
    let finalDamage = damage;

    // Handle "+" damage attacks
    if (attack.damage && attack.damage.endsWith('+')) {
      const plusDamageBonus = await calculatePlusDamageBonus(
        attack,
        attackerCard.name,
        updatedPlayerState,
        updatedOpponentState,
        attack.text,
        currentGameState,
        playerIdentifier,
      );
      finalDamage += plusDamageBonus;
    }

    // Apply structured damage modifiers from attack effects
    if (attack.hasEffects()) {
      const damageModifiers = attack.getEffectsByType(
        AttackEffectType.DAMAGE_MODIFIER,
      );
      for (const modifierEffect of damageModifiers as DamageModifierEffect[]) {
        const conditionsMet = await evaluateEffectConditions(
          modifierEffect.requiredConditions || [],
          currentGameState,
          playerIdentifier,
          updatedPlayerState,
          updatedOpponentState,
        );
        if (conditionsMet) {
          finalDamage += modifierEffect.modifier;
        }
      }
    }

    finalDamage = Math.max(0, finalDamage);

    // Apply weakness
    if (defenderCard.weakness && attackerCard.pokemonType) {
      if (
        defenderCard.weakness.type.toString() ===
        attackerCard.pokemonType.toString()
      ) {
        const modifier = defenderCard.weakness.modifier;
        if (modifier === '×2') {
          finalDamage = finalDamage * 2;
        }
      }
    }

    // Apply resistance
    if (defenderCard.resistance && attackerCard.pokemonType) {
      if (
        defenderCard.resistance.type.toString() ===
        attackerCard.pokemonType.toString()
      ) {
        const modifier = defenderCard.resistance.modifier;
        const reduction = parseInt(modifier, 10);
        if (!isNaN(reduction)) {
          finalDamage = Math.max(0, finalDamage + reduction);
        }
      }
    }

    // Apply damage prevention
    if (!updatedOpponentState.activePokemon) {
      throw new BadRequestException('Opponent active Pokemon is null');
    }
    const preventionEffect = currentGameState.getDamagePrevention(
      playerIdentifier === PlayerIdentifier.PLAYER1
        ? PlayerIdentifier.PLAYER2
        : PlayerIdentifier.PLAYER1,
      updatedOpponentState.activePokemon.instanceId,
    );

    if (preventionEffect) {
      if (preventionEffect.amount === 'all') {
        finalDamage = 0;
      } else if (typeof preventionEffect.amount === 'number') {
        if (finalDamage <= preventionEffect.amount) {
          finalDamage = 0;
        }
      }
    }

    // Apply damage reduction
    if (!updatedOpponentState.activePokemon) {
      throw new BadRequestException('Opponent active Pokemon is null');
    }
    const reductionAmount = currentGameState.getDamageReduction(
      playerIdentifier === PlayerIdentifier.PLAYER1
        ? PlayerIdentifier.PLAYER2
        : PlayerIdentifier.PLAYER1,
      updatedOpponentState.activePokemon.instanceId,
    );
    if (reductionAmount > 0) {
      finalDamage = Math.max(0, finalDamage - reductionAmount);
    }

    // Parse self-damage and bench damage
    const attackText = attack.text || '';
    const selfDamage = parseSelfDamage(attackText, attackerCard.name);
    const benchDamage = parseBenchDamage(attackText);

    // Apply damage to opponent's active Pokemon
    if (!updatedOpponentState.activePokemon) {
      throw new BadRequestException('Opponent active Pokemon is null');
    }
    const newHp = Math.max(
      0,
      updatedOpponentState.activePokemon.currentHp - finalDamage,
    );
    let updatedOpponentActive =
      updatedOpponentState.activePokemon.withHp(newHp);

    // Track status effects and coin flip results
    let attackCoinFlipResults: CoinFlipResult[] = [];
    let attackStatusEffectApplied = false;
    let attackAppliedStatus: StatusEffect | null = null;

    // Apply status effects from attack
    if (attack.hasEffects()) {
      const statusEffects = attack.getEffectsByType(
        AttackEffectType.STATUS_CONDITION,
      );
      for (const statusEffect of statusEffects as StatusConditionEffect[]) {
        // Check if coin flip condition is required
        const hasCoinFlipCondition = statusEffect.requiredConditions?.some(
          (c) =>
            c.type === ConditionType.COIN_FLIP_SUCCESS ||
            c.type === ConditionType.COIN_FLIP_FAILURE,
        );

        // If coin flip is required but results not provided, skip
        // (This should be handled by coin flip service)
        if (hasCoinFlipCondition && attackCoinFlipResults.length === 0) {
          continue;
        }

        const conditionsMet = await evaluateEffectConditions(
          statusEffect.requiredConditions || [],
          currentGameState,
          playerIdentifier,
          updatedPlayerState,
          updatedOpponentState,
          attackCoinFlipResults,
        );

        if (conditionsMet) {
          // Map string literal to StatusEffect enum
          const statusToApply = this.mapStatusConditionToStatusEffect(
            statusEffect.statusCondition,
          );
          if (statusToApply) {
            updatedOpponentActive =
              updatedOpponentActive.withStatusEffect(statusToApply);
            attackStatusEffectApplied = true;
            attackAppliedStatus = statusToApply;
          }
        }
      }
    }

    // Fallback: parse status effect from attack text if not in structured effects
    if (!attackStatusEffectApplied) {
      const parsedStatus = parseStatusEffectFromAttackText(attackText);
      if (parsedStatus) {
        updatedOpponentActive =
          updatedOpponentActive.withStatusEffect(parsedStatus);
        attackStatusEffectApplied = true;
        attackAppliedStatus = parsedStatus;
      }
    }

    // Check for knockout
    const isKnockedOut = updatedOpponentActive.currentHp === 0;

    // Apply self-damage if needed
    if (selfDamage > 0 && updatedPlayerState.activePokemon) {
      const attackerNewHp = Math.max(
        0,
        updatedPlayerState.activePokemon.currentHp - selfDamage,
      );
      const updatedAttacker =
        updatedPlayerState.activePokemon.withHp(attackerNewHp);

      if (attackerNewHp === 0) {
        const attackerCardsToDiscard =
          updatedPlayerState.activePokemon.getAllCardsToDiscard();
        const attackerDiscardPile = [
          ...updatedPlayerState.discardPile,
          ...attackerCardsToDiscard,
        ];
        updatedPlayerState = updatedPlayerState
          .withActivePokemon(null)
          .withDiscardPile(attackerDiscardPile);
      } else {
        updatedPlayerState = updatedPlayerState.withActivePokemon(
          updatedAttacker,
        );
      }
    }

    // Apply bench damage if needed
    if (benchDamage > 0 && updatedOpponentState.bench.length > 0) {
      const updatedBench = updatedOpponentState.bench.map((benchPokemon) => {
        const benchNewHp = Math.max(0, benchPokemon.currentHp - benchDamage);
        const updatedBenchPokemon = benchPokemon.withHp(benchNewHp);

        if (benchNewHp === 0) {
          // Knockout - will be handled separately
        }

        return updatedBenchPokemon;
      });

      // Filter out knocked out bench Pokemon and add to discard
      const knockedOutBench = updatedBench.filter((p) => p.currentHp === 0);
      const remainingBench = updatedBench.filter((p) => p.currentHp > 0);

      if (knockedOutBench.length > 0) {
        const cardsToDiscard = knockedOutBench.flatMap((p) =>
          p.getAllCardsToDiscard(),
        );
        const discardPile = [...updatedOpponentState.discardPile, ...cardsToDiscard];
        updatedOpponentState = updatedOpponentState
          .withBench(remainingBench)
          .withDiscardPile(discardPile);
      } else {
        updatedOpponentState = updatedOpponentState.withBench(updatedBench);
      }
    }

    // Update opponent state with damaged/knocked out active Pokemon
    if (isKnockedOut) {
      const cardsToDiscard =
        updatedOpponentActive.getAllCardsToDiscard();
      const discardPile = [
        ...updatedOpponentState.discardPile,
        ...cardsToDiscard,
      ];
      updatedOpponentState = updatedOpponentState
        .withActivePokemon(null)
        .withDiscardPile(discardPile);
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

  /**
   * Map status condition string to StatusEffect enum
   */
  private mapStatusConditionToStatusEffect(
    statusCondition: string,
  ): StatusEffect | null {
    // Map string literal to StatusEffect enum
    switch (statusCondition) {
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
  }
}

