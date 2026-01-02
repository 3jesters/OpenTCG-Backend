import { Injectable, Inject } from '@nestjs/common';
import { GameState, PlayerGameState, CardInstance } from '../../../domain/value-objects';
import { PlayerIdentifier, PokemonPosition } from '../../../domain/enums';
import { Card } from '../../../../card/domain/entities';
import { Attack } from '../../../../card/domain/value-objects';
import { CardType } from '../../../../card/domain/enums';
import { PreconditionType } from '../../../../card/domain/enums/precondition-type.enum';
import { PokemonScoringService } from './pokemon-scoring.service';
import { AttackDamageCalculationService } from '../../../domain/services/attack/attack-damage-calculation.service';
import { AttackEnergyValidatorService } from '../../../domain/services/attack/energy-requirements/attack-energy-validator.service';
import { PokemonScore, OpponentThreat } from '../types/action-analysis.types';
import { ILogger } from '../../../../../shared/application/ports/logger.interface';

/**
 * Opponent Analysis Service
 * Analyzes opponent's threat level and attack capabilities
 */
@Injectable()
export class OpponentAnalysisService {
  constructor(
    private readonly pokemonScoringService: PokemonScoringService,
    private readonly attackDamageCalculationService: AttackDamageCalculationService,
    private readonly attackEnergyValidatorService: AttackEnergyValidatorService,
    @Inject(ILogger)
    private readonly logger: ILogger,
  ) {}

  /**
   * Calculate sure attack damage - maximum damage opponent can deal without playing any cards
   * Only considers attacks with sufficient energy already attached
   */
  async calculateSureAttackDamage(
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    cardsMap: Map<string, Card>,
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<number> {
    this.logger.debug('calculateSureAttackDamage called', 'OpponentAnalysisService', {
      playerIdentifier,
      hasOpponentActive: !!gameState.getOpponentState(playerIdentifier).activePokemon,
    });

    const opponentState = gameState.getOpponentState(playerIdentifier);
    const playerState = gameState.getPlayerState(playerIdentifier);

    if (!opponentState.activePokemon) {
      this.logger.debug('No opponent active Pokemon, returning 0', 'OpponentAnalysisService');
      return 0;
    }

    // Get opponent's active Pokemon card
    const opponentCard = await getCardEntity(opponentState.activePokemon.cardId);
    if (!opponentCard.attacks || opponentCard.attacks.length === 0) {
      return 0;
    }

    let maxDamage = 0;

    // Check each attack
    for (const attack of opponentCard.attacks) {
      // Convert attached energy to energy card data format
      const energyCardData = this.getEnergyCardData(
        opponentState.activePokemon.attachedEnergy || [],
        cardsMap,
      );

      // Validate energy requirements
      const energyValidation =
        this.attackEnergyValidatorService.validateEnergyRequirements(
          attack,
          energyCardData,
        );

      if (!energyValidation.isValid) {
        continue; // Skip this attack, insufficient energy
      }

      // Calculate damage for this attack
      const baseDamage = this.parseBaseDamage(attack.damage);
      if (baseDamage === 0) {
        continue; // No damage attack
      }

      // For sure damage, we need a defender card
      // If player has no active Pokemon, opponent can't attack, so skip
      if (!playerState.activePokemon) {
        continue;
      }

      const defenderCard = await getCardEntity(playerState.activePokemon.cardId);

      // Calculate final damage (without coin flips - this is "sure" damage)
      // For sure damage, we don't assume coin flips, so we use base damage
      // But we still need to account for weakness/resistance
      const finalDamage = await this.attackDamageCalculationService.calculateFinalDamage(
        {
          baseDamage,
          attack,
          attackerCard: opponentCard,
          defenderCard,
          gameState,
          playerIdentifier: this.getOpponentIdentifier(playerIdentifier),
          playerState: opponentState,
          opponentState: playerState,
          calculateMinusDamageReduction: (damage) => damage, // Pass through (no reduction for sure damage analysis)
          calculatePlusDamageBonus: async () => 0, // No bonus for sure damage
          evaluateEffectConditions: async () => false, // No conditions for sure damage
        },
      );

      maxDamage = Math.max(maxDamage, finalDamage);
      this.logger.verbose('Attack damage calculated', 'OpponentAnalysisService', {
        attackName: attack.name,
        baseDamage,
        finalDamage,
        maxDamage,
      });
    }

    this.logger.debug('Sure attack damage calculated', 'OpponentAnalysisService', {
      maxDamage,
    });
    return maxDamage;
  }

  /**
   * Calculate risk attack damage - maximum damage opponent could potentially deal
   * Includes coin flip bonuses (assume best case) and potential energy attachments from hand
   */
  async calculateRiskAttackDamage(
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    cardsMap: Map<string, Card>,
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<number> {
    this.logger.debug('calculateRiskAttackDamage called', 'OpponentAnalysisService', {
      playerIdentifier,
    });

    const opponentState = gameState.getOpponentState(playerIdentifier);
    const playerState = gameState.getPlayerState(playerIdentifier);

    if (!opponentState.activePokemon) {
      this.logger.debug('No opponent active Pokemon, returning 0', 'OpponentAnalysisService');
      return 0;
    }

    // Get opponent's active Pokemon card
    const opponentCard = await getCardEntity(opponentState.activePokemon.cardId);
    if (!opponentCard.attacks || opponentCard.attacks.length === 0) {
      return 0;
    }

    let maxDamage = 0;

    // Check each attack
    for (const attack of opponentCard.attacks) {
      // First check with current energy
      let energyCardData = this.getEnergyCardData(
        opponentState.activePokemon.attachedEnergy || [],
        cardsMap,
      );

      let canPerformAttack = this.attackEnergyValidatorService
        .validateEnergyRequirements(attack, energyCardData)
        .isValid;

      // If insufficient energy, check if opponent has energy in hand
      if (!canPerformAttack) {
        const handEnergyCards = this.getEnergyCardsFromHand(
          opponentState.hand,
          cardsMap,
        );
        if (handEnergyCards.length > 0) {
          // Assume opponent can attach one energy from hand
          // Combine current energy with one from hand
          const allEnergyData = [
            ...energyCardData,
            ...handEnergyCards.slice(0, 1).map((card) => ({
              cardType: card.cardType,
              energyType: card.energyType,
              energyProvision: card.energyProvision,
            })),
          ];
          canPerformAttack = this.attackEnergyValidatorService
            .validateEnergyRequirements(attack, allEnergyData)
            .isValid;
        }
      }

      if (!canPerformAttack) {
        continue; // Cannot perform this attack even with hand energy
      }

      // Calculate damage for this attack
      const baseDamage = this.parseBaseDamage(attack.damage);
      if (baseDamage === 0) {
        continue; // No damage attack
      }

      // For risk damage, we need a defender card
      // If player has no active Pokemon, opponent can't attack, so skip
      if (!playerState.activePokemon) {
        continue;
      }

      const defenderCard = await getCardEntity(playerState.activePokemon.cardId);

      // For risk damage, assume best case scenario (coin flips succeed)
      // Calculate with coin flip bonuses if applicable
      const riskDamage = await this.calculateRiskDamage(
        baseDamage,
        attack,
        opponentCard,
        defenderCard,
        gameState,
        playerIdentifier,
        opponentState,
        playerState,
      );

      maxDamage = Math.max(maxDamage, riskDamage);
    }

    return maxDamage;
  }

  /**
   * Score all Pokemon in opponent's hand, bench, and active
   */
  async scoreOpponentPokemon(
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    cardsMap: Map<string, Card>,
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<PokemonScore[]> {
    const opponentState = gameState.getOpponentState(playerIdentifier);
    const scores: PokemonScore[] = [];

    // Score active Pokemon
    if (opponentState.activePokemon) {
      const card = await getCardEntity(opponentState.activePokemon.cardId);
      if (card.cardType === CardType.POKEMON) {
        const score = this.pokemonScoringService.scorePokemon(
          opponentState.activePokemon,
          card,
        );
        scores.push(score);
      }
    }

    // Score bench Pokemon
    for (const benchInstance of opponentState.bench) {
      const card = await getCardEntity(benchInstance.cardId);
      if (card.cardType === CardType.POKEMON) {
        const score = this.pokemonScoringService.scorePokemon(
          benchInstance,
          card,
        );
        scores.push(score);
      }
    }

    // Score Pokemon in hand (create temporary CardInstance for scoring)
    for (const handCardId of opponentState.hand) {
      const card = await getCardEntity(handCardId);
      if (card.cardType === CardType.POKEMON) {
        // Create temporary CardInstance for hand Pokemon
        const tempInstance = new CardInstance(
          `temp-${handCardId}`,
          handCardId,
          PokemonPosition.BENCH_0, // Temporary position
          card.hp || 0,
          card.hp || 0,
          [], // No energy attached
          [], // No status effects
          [], // No evolution chain
          undefined, // poisonDamageAmount
          undefined, // evolvedAt
          undefined, // paralysisClearsAtTurn
        );
        const score = this.pokemonScoringService.scorePokemon(
          tempInstance,
          card,
        );
        scores.push(score);
      }
    }

    return scores;
  }

  /**
   * Identify most threatening Pokemon (highest scored) from opponent's hand and bench
   * Returns the position of the most threatening Pokemon, or null if none
   */
  async identifyMostThreateningPokemon(
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    cardsMap: Map<string, Card>,
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<PokemonPosition | null> {
    const scores = await this.scoreOpponentPokemon(
      gameState,
      playerIdentifier,
      cardsMap,
      getCardEntity,
    );

    if (scores.length === 0) {
      return null;
    }

    // Sort by score (highest first) and return position of first
    const sorted = scores.sort((a, b) => b.score - a.score);
    return sorted[0].position;
  }

  /**
   * Check if opponent can knockout our active Pokemon
   */
  async canOpponentKnockout(
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    cardsMap: Map<string, Card>,
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<boolean> {
    this.logger.debug('canOpponentKnockout called', 'OpponentAnalysisService', {
      playerIdentifier,
      activeHp: gameState.getPlayerState(playerIdentifier).activePokemon?.currentHp,
    });
    const playerState = gameState.getPlayerState(playerIdentifier);

    if (!playerState.activePokemon) {
      this.logger.debug('No active Pokemon, opponent cannot knockout', 'OpponentAnalysisService');
      return false; // No active Pokemon to knockout
    }

    // Calculate risk attack damage (best case scenario)
    const riskDamage = await this.calculateRiskAttackDamage(
      gameState,
      playerIdentifier,
      cardsMap,
      getCardEntity,
    );

    // Check if damage >= current HP
    const canKnockout = riskDamage >= playerState.activePokemon.currentHp;
    this.logger.info('Opponent knockout check result', 'OpponentAnalysisService', {
      riskDamage,
      currentHp: playerState.activePokemon.currentHp,
      canKnockout,
    });
    return canKnockout;
  }

  /**
   * Analyze complete opponent threat
   */
  async analyzeOpponentThreat(
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    cardsMap: Map<string, Card>,
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<OpponentThreat> {
    const opponentState = gameState.getOpponentState(playerIdentifier);
    const playerState = gameState.getPlayerState(playerIdentifier);

    // Calculate sure and risk attack damage
    const sureAttackDamage = await this.calculateSureAttackDamage(
      gameState,
      playerIdentifier,
      cardsMap,
      getCardEntity,
    );

    const riskAttackDamage = await this.calculateRiskAttackDamage(
      gameState,
      playerIdentifier,
      cardsMap,
      getCardEntity,
    );

    // Check knockout potential
    const canKnockoutActive = await this.canOpponentKnockout(
      gameState,
      playerIdentifier,
      cardsMap,
      getCardEntity,
    );

    // Score opponent Pokemon and find most threatening
    const scores = await this.scoreOpponentPokemon(
      gameState,
      playerIdentifier,
      cardsMap,
      getCardEntity,
    );

    // Find most threatening from scored Pokemon
    let mostThreateningPosition: PokemonPosition | null = null;
    if (scores.length > 0) {
      const sorted = scores.sort((a, b) => b.score - a.score);
      mostThreateningPosition = sorted[0].position;
    }

    // Get active Pokemon score from scored Pokemon
    let activePokemonScore = 0;
    if (opponentState.activePokemon) {
      const activeScore = scores.find(
        (score) =>
          score.cardInstance.instanceId ===
          opponentState.activePokemon!.instanceId,
      );
      activePokemonScore = activeScore?.score || 0;
    }

    // Check which bench Pokemon can be knocked out (for future use)
    const canKnockoutBench: CardInstance[] = [];
    // TODO: Implement bench knockout analysis if needed

    return {
      sureAttackDamage,
      riskAttackDamage,
      canKnockoutActive,
      canKnockoutBench,
      mostThreateningPokemon: mostThreateningPosition,
      activePokemonScore,
    };
  }

  /**
   * Get energy card data from energy card IDs
   */
  private getEnergyCardData(
    energyCardIds: string[],
    cardsMap: Map<string, Card>,
  ): Array<{
    cardType: CardType;
    energyType?: any;
    energyProvision?: any;
  }> {
    return energyCardIds
      .map((cardId) => cardsMap.get(cardId))
      .filter((card): card is Card => card !== undefined)
      .filter((card) => card.cardType === CardType.ENERGY)
      .map((card) => ({
        cardType: card.cardType,
        energyType: card.energyType,
        energyProvision: card.energyProvision,
      }));
  }

  /**
   * Get energy cards from hand
   */
  private getEnergyCardsFromHand(
    handCardIds: string[],
    cardsMap: Map<string, Card>,
  ): Card[] {
    return handCardIds
      .map((cardId) => cardsMap.get(cardId))
      .filter((card): card is Card => card !== undefined)
      .filter((card) => card.cardType === CardType.ENERGY);
  }

  /**
   * Parse base damage from damage string
   */
  private parseBaseDamage(damage: string): number {
    if (!damage || damage.trim() === '') {
      return 0;
    }
    const match = damage.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Calculate risk damage (assuming best case coin flips)
   */
  private async calculateRiskDamage(
    baseDamage: number,
    attack: Attack,
    attackerCard: Card,
    defenderCard: Card,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    attackerState: PlayerGameState,
    defenderState: PlayerGameState,
  ): Promise<number> {
    // Check if attack has coin flip that affects damage
    const hasCoinFlip =
      attack.hasPreconditions() &&
      attack.getPreconditionsByType(PreconditionType.COIN_FLIP).length > 0;

    let adjustedDamage = baseDamage;

    if (hasCoinFlip) {
      const attackText = attack.text.toLowerCase();

      // Pattern: "Flip a coin. If heads, this attack does X more damage."
      const bonusMatch = attackText.match(
        /if heads.*?(\d+)\s+more\s+damage/i,
      );
      if (bonusMatch) {
        const bonus = parseInt(bonusMatch[1], 10);
        adjustedDamage = baseDamage + bonus; // Assume heads (best case)
      }

      // Pattern: "Flip a coin. If tails, this attack does nothing."
      // For risk damage, assume heads, so use base damage
      // (already set to baseDamage above)

      // Pattern: "Flip X coins. This attack does Y damage times the number of heads."
      const multiplyMatch = attackText.match(
        /flip (\d+) coins?.*?does (\d+) damage times the number of heads/i,
      );
      if (multiplyMatch) {
        const coinCount = parseInt(multiplyMatch[1], 10);
        const damagePerHead = parseInt(multiplyMatch[2], 10);
        adjustedDamage = coinCount * damagePerHead; // Assume all heads (best case)
      }
    }

    // Calculate final damage with modifiers
    const finalDamage =
      await this.attackDamageCalculationService.calculateFinalDamage({
        baseDamage: adjustedDamage,
        attack,
        attackerCard,
        defenderCard,
        gameState,
        playerIdentifier,
        playerState: attackerState,
        opponentState: defenderState,
        calculateMinusDamageReduction: () => adjustedDamage,
        calculatePlusDamageBonus: async () => 0,
        evaluateEffectConditions: async () => true, // Assume conditions met for risk
      });

    return finalDamage;
  }

  /**
   * Get opponent identifier
   */
  private getOpponentIdentifier(
    playerIdentifier: PlayerIdentifier,
  ): PlayerIdentifier {
    return playerIdentifier === PlayerIdentifier.PLAYER1
      ? PlayerIdentifier.PLAYER2
      : PlayerIdentifier.PLAYER1;
  }
}

