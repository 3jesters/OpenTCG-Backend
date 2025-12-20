import { PlayerGameState } from '../../../value-objects';
import { StatusEffect } from '../../../enums/status-effect.enum';
import { CoinFlipResult } from '../../../value-objects/coin-flip-result.value-object';

/**
 * Result of attack execution
 */
export interface AttackExecutionResult {
  updatedPlayerState: PlayerGameState;
  updatedOpponentState: PlayerGameState;
  finalDamage: number;
  isKnockedOut: boolean;
  statusEffectApplied: boolean;
  appliedStatus?: StatusEffect;
  coinFlipResults: CoinFlipResult[];
  actionData: any;
}

