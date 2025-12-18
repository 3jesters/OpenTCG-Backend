/**
 * Coin Flip Result Value Object
 * Represents the result of a single coin flip
 */
export class CoinFlipResult {
  constructor(
    public readonly flipIndex: number, // Which flip in the sequence (0-based)
    public readonly result: 'heads' | 'tails',
    public readonly seed: number, // Seed used for this flip (for reproducibility)
  ) {}

  isHeads(): boolean {
    return this.result === 'heads';
  }

  isTails(): boolean {
    return this.result === 'tails';
  }
}
