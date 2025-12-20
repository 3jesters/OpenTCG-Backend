import { Injectable, Inject } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import {
  GameState,
  PlayerGameState,
  CardInstance,
} from '../../domain/value-objects';
import {
  PlayerIdentifier,
  TurnPhase,
  PlayerActionType,
} from '../../domain/enums';
import { Card } from '../../../card/domain/entities';
import {
  CardType,
  EvolutionStage,
} from '../../../card/domain/enums';
import { IGetCardByIdUseCase } from '../../../card/application/ports/card-use-cases.interface';
import { CardHelperService } from './card-helper.service';

export interface EvolvePokemonParams {
  evolutionCardId: string;
  target: string; // 'ACTIVE' or 'BENCH_0', 'BENCH_1', etc.
  gameState: GameState;
  playerIdentifier: PlayerIdentifier;
  cardsMap: Map<string, Card>;
}

export interface EvolvePokemonResult {
  updatedGameState: GameState;
  targetInstanceId: string;
}

@Injectable()
export class EvolutionExecutionService {
  constructor(
    @Inject(IGetCardByIdUseCase)
    private readonly getCardByIdUseCase: IGetCardByIdUseCase,
    private readonly cardHelper: CardHelperService,
  ) {}

  /**
   * Execute Pokemon evolution
   */
  async executeEvolvePokemon(
    params: EvolvePokemonParams,
  ): Promise<EvolvePokemonResult> {
    const {
      evolutionCardId,
      target,
      gameState,
      playerIdentifier,
      cardsMap,
    } = params;

    // Validate phase
    if (gameState.phase !== TurnPhase.MAIN_PHASE) {
      throw new BadRequestException(
        `Cannot evolve Pokemon in phase ${gameState.phase}. Must be MAIN_PHASE`,
      );
    }

    const playerState = gameState.getPlayerState(playerIdentifier);

    // Check if evolution card is in hand
    if (!playerState.hand.includes(evolutionCardId)) {
      throw new BadRequestException('Evolution card must be in hand');
    }

    // Find target Pokemon to evolve
    let targetPokemon: CardInstance | null = null;
    let updatedBench: CardInstance[] = [...playerState.bench];

    if (target === 'ACTIVE') {
      if (!playerState.activePokemon) {
        throw new BadRequestException('No active Pokemon to evolve');
      }
      targetPokemon = playerState.activePokemon;
    } else {
      // BENCH_0, BENCH_1, etc.
      const benchIndex = parseInt(target.replace('BENCH_', ''));
      if (benchIndex < 0 || benchIndex >= playerState.bench.length) {
        throw new BadRequestException(`Invalid bench position: ${target}`);
      }
      targetPokemon = playerState.bench[benchIndex];
    }

    // Load evolution card details to get HP
    const evolutionCardHp = await this.cardHelper.getCardHp(evolutionCardId, cardsMap);

    // Calculate damage taken (preserve absolute damage amount)
    const damageTaken = targetPokemon.maxHp - targetPokemon.currentHp;

    // Apply the same damage to the evolved Pokemon
    // New current HP = new max HP - same damage amount
    const newCurrentHp = Math.max(0, evolutionCardHp - damageTaken);

    // Build evolution chain: add current card to existing chain
    const evolutionChain = [
      targetPokemon.cardId,
      ...targetPokemon.evolutionChain,
    ];

    // Create evolved Pokemon instance (preserve damage amount, energy, but clear status effects)
    // Evolution cures all status effects (sleep, confused, poison, paralyzed, burned)
    const evolvedPokemon = new CardInstance(
      targetPokemon.instanceId, // Keep same instance ID
      evolutionCardId, // New card ID
      targetPokemon.position,
      newCurrentHp,
      evolutionCardHp, // Use actual HP from evolution card
      targetPokemon.attachedEnergy, // Preserve attached energy
      [], // Clear all status effects on evolution (empty array)
      evolutionChain, // Add evolution chain
      undefined, // Clear poison damage amount (status effect is cleared)
      gameState.turnNumber, // evolvedAt = current turn number
    );

    // Remove evolution card from hand
    const updatedHand = playerState.hand.filter(
      (id) => id !== evolutionCardId,
    );

    // Update bench if needed
    if (target !== 'ACTIVE') {
      const benchIndex = parseInt(target.replace('BENCH_', ''));
      updatedBench = playerState.bench.map((pokemon, index) =>
        index === benchIndex ? evolvedPokemon : pokemon,
      );
    }

    // Update player state
    const updatedPlayerState = new PlayerGameState(
      playerState.deck,
      updatedHand,
      target === 'ACTIVE' ? evolvedPokemon : playerState.activePokemon,
      updatedBench,
      playerState.prizeCards,
      playerState.discardPile,
      playerState.hasAttachedEnergyThisTurn,
    );

    // Update game state
    const updatedGameState =
      playerIdentifier === PlayerIdentifier.PLAYER1
        ? gameState.withPlayer1State(updatedPlayerState)
        : gameState.withPlayer2State(updatedPlayerState);

    return {
      updatedGameState,
      targetInstanceId: targetPokemon.instanceId,
    };
  }
}

