import { CoinFlipStatus } from '../enums/coin-flip-status.enum';
import { CoinFlipContext } from '../enums/coin-flip-context.enum';
import { CoinFlipConfiguration, CoinFlipCountType } from './coin-flip-configuration.value-object';
import { CoinFlipResult } from './coin-flip-result.value-object';

/**
 * Coin Flip State Value Object
 * Represents the current state of a coin flip operation in the game
 */
export class CoinFlipState {
  constructor(
    public readonly status: CoinFlipStatus,
    public readonly context: CoinFlipContext,
    public readonly configuration: CoinFlipConfiguration,
    public readonly results: CoinFlipResult[] = [], // Results of completed flips
    // Context-specific data
    public readonly attackIndex?: number, // For ATTACK context
    public readonly pokemonInstanceId?: string, // For STATUS_CHECK context
    public readonly statusEffect?: string, // For STATUS_CHECK context
    public readonly actionId?: string, // ID of the action that triggered this coin flip
    // Approval tracking (for attack coin flips requiring both players to see)
    public readonly player1HasApproved: boolean = false,
    public readonly player2HasApproved: boolean = false,
  ) {}

  /**
   * Create a new CoinFlipState with updated status
   */
  withStatus(status: CoinFlipStatus): CoinFlipState {
    return new CoinFlipState(
      status,
      this.context,
      this.configuration,
      this.results,
      this.attackIndex,
      this.pokemonInstanceId,
      this.statusEffect,
      this.actionId,
      this.player1HasApproved,
      this.player2HasApproved,
    );
  }

  /**
   * Create a new CoinFlipState with added result
   */
  withResult(result: CoinFlipResult): CoinFlipState {
    return new CoinFlipState(
      this.status,
      this.context,
      this.configuration,
      [...this.results, result],
      this.attackIndex,
      this.pokemonInstanceId,
      this.statusEffect,
      this.actionId,
      this.player1HasApproved,
      this.player2HasApproved,
    );
  }

  /**
   * Create a new CoinFlipState with player 1 approval
   */
  withPlayer1Approval(): CoinFlipState {
    return new CoinFlipState(
      this.status,
      this.context,
      this.configuration,
      this.results,
      this.attackIndex,
      this.pokemonInstanceId,
      this.statusEffect,
      this.actionId,
      true,
      this.player2HasApproved,
    );
  }

  /**
   * Create a new CoinFlipState with player 2 approval
   */
  withPlayer2Approval(): CoinFlipState {
    return new CoinFlipState(
      this.status,
      this.context,
      this.configuration,
      this.results,
      this.attackIndex,
      this.pokemonInstanceId,
      this.statusEffect,
      this.actionId,
      this.player1HasApproved,
      true,
    );
  }

  /**
   * Check if both players have approved
   */
  hasBothApprovals(): boolean {
    return this.player1HasApproved && this.player2HasApproved;
  }

  /**
   * Get number of heads in results
   */
  getHeadsCount(): number {
    return this.results.filter((r) => r.isHeads()).length;
  }

  /**
   * Get number of tails in results
   */
  getTailsCount(): number {
    return this.results.filter((r) => r.isTails()).length;
  }

  /**
   * Check if all required flips are complete
   */
  isComplete(): boolean {
    if (this.configuration.countType === CoinFlipCountType.UNTIL_TAILS) {
      // Complete if we have at least one tails
      return this.getTailsCount() > 0;
    }
    if (this.configuration.countType === CoinFlipCountType.FIXED) {
      // Complete if we have the required number of flips
      return this.results.length >= (this.configuration.fixedCount || 0);
    }
    // VARIABLE type - completion depends on calculated count (handled by resolver)
    return false;
  }
}

