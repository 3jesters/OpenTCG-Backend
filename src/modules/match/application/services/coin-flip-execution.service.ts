import { Injectable } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import {
  GameState,
  CoinFlipState,
  CoinFlipResult,
} from '../../domain/value-objects';
import {
  PlayerIdentifier,
  CoinFlipStatus,
  CoinFlipContext,
} from '../../domain/enums';
import {
  CoinFlipCountType,
  DamageCalculationType,
} from '../../domain/value-objects/coin-flip-configuration.value-object';
import { CoinFlipResolverService } from '../../domain/services/coin-flip/coin-flip-resolver.service';
import { AttackCoinFlipParserService } from '../../domain/services/attack/coin-flip-detection/attack-coin-flip-parser.service';
import { AttackExecutionService } from './attack-execution.service';
import { Card } from '../../../card/domain/entities';
import { Attack } from '../../../card/domain/value-objects/attack.value-object';
import { v4 as uuidv4 } from 'uuid';

export interface GenerateCoinFlipParams {
  gameState: GameState;
  playerIdentifier: PlayerIdentifier;
  matchId: string;
  cardsMap: Map<string, Card>;
  getCardEntity: (cardId: string) => Promise<Card>;
  getCardHp: (cardId: string) => Promise<number>;
  calculateMinusDamageReduction: (
    damage: number,
    attack: Attack,
    attackText: string,
    attackerName: string,
    playerState: any,
    opponentState: any,
  ) => number;
  calculatePlusDamageBonus: (
    attack: Attack,
    attackerName: string,
    playerState: any,
    opponentState: any,
    attackText: string,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
  ) => Promise<number>;
  evaluateEffectConditions: (
    conditions: any[],
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    playerState: any,
    opponentState: any,
    coinFlipResults?: CoinFlipResult[],
  ) => Promise<boolean>;
  parseSelfDamage: (attackText: string, attackerName: string) => number;
  parseBenchDamage: (attackText: string) => number;
  parseStatusEffectFromAttackText: (attackText: string) => any;
  validateEnergySelection: (
    selectedEnergyIds: string[],
    discardEffect: any,
    pokemon: any,
  ) => Promise<string | null>;
  applyDiscardEnergyEffects: (
    discardEffects: any[],
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    playerState: any,
    opponentState: any,
  ) => Promise<{
    updatedPlayerState: any;
    updatedOpponentState: any;
  }>;
}

export interface GenerateCoinFlipResult {
  updatedGameState: GameState;
  shouldResolveAttack: boolean; // For ATTACK context, indicates if attack should be resolved
}

@Injectable()
export class CoinFlipExecutionService {
  constructor(
    private readonly coinFlipResolver: CoinFlipResolverService,
    private readonly attackCoinFlipParser: AttackCoinFlipParserService,
    private readonly attackExecutionService: AttackExecutionService,
  ) {}

  /**
   * Generate coin flip results
   */
  async generateCoinFlip(
    params: GenerateCoinFlipParams,
  ): Promise<GenerateCoinFlipResult> {
    const { gameState, playerIdentifier, matchId } = params;

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
          throw new BadRequestException('Player 1 has already approved');
        }
        updatedCoinFlipState = updatedCoinFlipState.withPlayer1Approval();
      } else {
        if (coinFlipState.player2HasApproved) {
          throw new BadRequestException('Player 2 has already approved');
        }
        updatedCoinFlipState = updatedCoinFlipState.withPlayer2Approval();
      }

      // For ATTACK context, complete immediately after first approval (no need to wait for both)
      // For other contexts, also complete immediately after first approval
      // Note: This path is only reached when results already exist, so this is the second approval
      // For ATTACK context, we want to complete immediately, so this handles the case where
      // the second player approves after the first player already generated results
      if (
        updatedCoinFlipState.context === CoinFlipContext.ATTACK
      ) {
        // ATTACK context: complete immediately after any approval
        updatedCoinFlipState =
          updatedCoinFlipState.withStatus(CoinFlipStatus.COMPLETED);
      } else {
        // Non-ATTACK context: complete immediately after first approval (consistent with first approval path)
        updatedCoinFlipState =
          updatedCoinFlipState.withStatus(CoinFlipStatus.COMPLETED);
      }

      const updatedGameState = gameState.withCoinFlipState(
        updatedCoinFlipState,
      );
      // For ATTACK context, apply results immediately after first approval
      // Must check: results are complete AND status is COMPLETED
      if (
        updatedCoinFlipState.context === CoinFlipContext.ATTACK &&
        updatedCoinFlipState.isComplete() &&
        updatedCoinFlipState.status === CoinFlipStatus.COMPLETED
      ) {
        return this.resolveAttackCoinFlip(
          updatedGameState,
          updatedCoinFlipState,
          params,
        );
      }
      return {
        updatedGameState,
        shouldResolveAttack: false,
      };
    }

    // Generate coin flip results
    // Determine the attacking player from the coin flip state context
    const attackingPlayer =
      coinFlipState.context === CoinFlipContext.ATTACK
        ? gameState.currentPlayer
        : playerIdentifier;
    const playerState = gameState.getPlayerState(attackingPlayer);
    const activePokemon = playerState.activePokemon;

    const coinCount = this.coinFlipResolver.calculateCoinCount(
      coinFlipState.configuration,
      playerState,
      activePokemon,
    );
    const results: CoinFlipResult[] = [];

    // Handle "until tails" pattern
    let updatedCoinFlipState = coinFlipState;
    if (
      coinFlipState.configuration.countType === CoinFlipCountType.UNTIL_TAILS
    ) {
      let flipIndex = 0;
      while (flipIndex < coinCount) {
        const result = this.coinFlipResolver.generateCoinFlip(
          matchId,
          gameState.turnNumber,
          coinFlipState.actionId || uuidv4(),
          flipIndex,
        );
        updatedCoinFlipState = updatedCoinFlipState.withResult(result);
        results.push(result);

        // Stop if we got tails
        if (result.isTails()) {
          break;
        }
        flipIndex++;
      }
    } else {
      // Fixed number of coins - generate all flips
      for (let i = 0; i < coinCount; i++) {
        const result = this.coinFlipResolver.generateCoinFlip(
          matchId,
          gameState.turnNumber,
          coinFlipState.actionId || uuidv4(),
          i,
        );
        updatedCoinFlipState = updatedCoinFlipState.withResult(result);
        results.push(result);
      }
    }

    // Track approval
    if (playerIdentifier === PlayerIdentifier.PLAYER1) {
      updatedCoinFlipState = updatedCoinFlipState.withPlayer1Approval();
    } else {
      updatedCoinFlipState = updatedCoinFlipState.withPlayer2Approval();
    }

    // For ATTACK context, complete immediately after first approval (no need to wait for both)
    // For other contexts, also complete immediately after first approval
    updatedCoinFlipState =
      updatedCoinFlipState.withStatus(CoinFlipStatus.COMPLETED);

    const updatedGameState = gameState.withCoinFlipState(
      updatedCoinFlipState,
    );

    // For ATTACK context, apply results immediately after first approval
    // Must check: results are complete AND status is COMPLETED
    if (
      updatedCoinFlipState.context === CoinFlipContext.ATTACK &&
      updatedCoinFlipState.isComplete() &&
      updatedCoinFlipState.status === CoinFlipStatus.COMPLETED
    ) {
      return this.resolveAttackCoinFlip(
        updatedGameState,
        updatedCoinFlipState,
        params,
      );
    }
    return {
      updatedGameState,
      shouldResolveAttack: false,
    };
  }

  /**
   * Resolve attack coin flip and execute attack
   */
  private async resolveAttackCoinFlip(
    gameState: GameState,
    coinFlipState: CoinFlipState,
    params: GenerateCoinFlipParams,
  ): Promise<GenerateCoinFlipResult> {
    const { playerIdentifier, cardsMap, getCardEntity } = params;

    if (coinFlipState.attackIndex === undefined) {
      throw new BadRequestException('Attack index not found in coin flip state');
    }

    // For ATTACK context, use currentPlayer (the attacker), not playerIdentifier (who approved)
    const attackingPlayer =
      coinFlipState.context === CoinFlipContext.ATTACK
        ? gameState.currentPlayer
        : playerIdentifier;

    const playerState = gameState.getPlayerState(attackingPlayer);
    const opponentState = gameState.getOpponentState(attackingPlayer);

    if (!playerState.activePokemon) {
      throw new BadRequestException('No active Pokemon to attack with');
    }
    if (!opponentState.activePokemon) {
      throw new BadRequestException('No opponent active Pokemon to attack');
    }

    // Load attacker card entity
    const attackerCardEntity = await getCardEntity(
      playerState.activePokemon.cardId,
    );
    if (
      !attackerCardEntity.attacks ||
      attackerCardEntity.attacks.length === 0
    ) {
      throw new BadRequestException('Attacker card has no attacks');
    }
    if (
      coinFlipState.attackIndex < 0 ||
      coinFlipState.attackIndex >= attackerCardEntity.attacks.length
    ) {
      throw new BadRequestException(
        `Invalid attack index: ${coinFlipState.attackIndex}`,
      );
    }
    const attack = attackerCardEntity.attacks[coinFlipState.attackIndex];

    // Re-parse the attack to ensure we have the correct configuration
    const correctCoinFlipConfig =
      this.attackCoinFlipParser.parseCoinFlipFromAttack(
        attack.text,
        attack.damage,
      );

    // Calculate damage based on coin flip results
    const baseDamageValue = parseInt(attack.damage || '0', 10);
    const coinFlipDamage = this.coinFlipResolver.calculateDamage(
      coinFlipState.configuration,
      coinFlipState.results,
      baseDamageValue,
    );

    // Use coin flip damage if available, otherwise use base damage
    const baseDamage = coinFlipDamage !== null
      ? coinFlipDamage
      : parseInt(attack.damage || '0', 10);

    // Execute attack with coin flip damage
    // This is a simplified version - the full attack execution should be handled by AttackExecutionService
    // For now, we'll return a flag indicating attack should be resolved
    // Ensure coin flip state has COMPLETED status for attack handler to detect it
    const completedCoinFlipState = coinFlipState.status === CoinFlipStatus.COMPLETED
      ? coinFlipState
      : coinFlipState.withStatus(CoinFlipStatus.COMPLETED);
    
    return {
      updatedGameState: gameState.withCoinFlipState(completedCoinFlipState), // Keep coin flip state with COMPLETED status for attack execution
      shouldResolveAttack: true,
    };
  }
}

