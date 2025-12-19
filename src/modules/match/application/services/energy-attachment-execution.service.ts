import { Injectable } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import {
  GameState,
  PlayerGameState,
  CardInstance,
} from '../../domain/value-objects';
import { PlayerIdentifier, TurnPhase } from '../../domain/enums';

export interface AttachEnergyParams {
  energyCardId: string;
  target: string; // 'ACTIVE' or 'BENCH_0', 'BENCH_1', etc.
  gameState: GameState;
  playerIdentifier: PlayerIdentifier;
}

export interface AttachEnergyResult {
  updatedGameState: GameState;
  targetInstanceId: string;
}

@Injectable()
export class EnergyAttachmentExecutionService {
  /**
   * Execute energy attachment to a Pokemon
   */
  executeAttachEnergy(params: AttachEnergyParams): AttachEnergyResult {
    const { energyCardId, target, gameState, playerIdentifier } = params;

    // Validate phase
    if (gameState.phase !== TurnPhase.MAIN_PHASE) {
      throw new BadRequestException(
        `Cannot attach energy in phase ${gameState.phase}. Must be MAIN_PHASE`,
      );
    }

    const playerState = gameState.getPlayerState(playerIdentifier);

    // Check if energy has already been attached this turn
    if (playerState.hasAttachedEnergyThisTurn) {
      throw new BadRequestException(
        'Energy can only be attached once per turn (unless using a special ability)',
      );
    }

    // Check if energy card is in hand
    if (!playerState.hand.includes(energyCardId)) {
      throw new BadRequestException('Energy card must be in hand');
    }

    // Find target Pokemon
    let targetPokemon: CardInstance | null = null;
    let updatedBench: CardInstance[] = [...playerState.bench];

    if (target === 'ACTIVE') {
      if (!playerState.activePokemon) {
        throw new BadRequestException(
          'No active Pokemon to attach energy to',
        );
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

    // Attach energy to Pokemon
    const updatedAttachedEnergy = [
      ...targetPokemon.attachedEnergy,
      energyCardId,
    ];
    const updatedPokemon = targetPokemon.withAttachedEnergy(
      updatedAttachedEnergy,
    );

    // Update bench if needed
    if (target !== 'ACTIVE') {
      const benchIndex = parseInt(target.replace('BENCH_', ''));
      updatedBench = playerState.bench.map((pokemon, index) =>
        index === benchIndex ? updatedPokemon : pokemon,
      );
    }

    // Remove one instance of energy card from hand
    const energyCardIndex = playerState.hand.indexOf(energyCardId);
    if (energyCardIndex === -1) {
      throw new BadRequestException('Energy card must be in hand');
    }
    const updatedHand = [
      ...playerState.hand.slice(0, energyCardIndex),
      ...playerState.hand.slice(energyCardIndex + 1),
    ];

    // Update player state - set hasAttachedEnergyThisTurn to true after successful attachment
    const updatedPlayerState = new PlayerGameState(
      playerState.deck,
      updatedHand,
      target === 'ACTIVE' ? updatedPokemon : playerState.activePokemon,
      updatedBench,
      playerState.prizeCards,
      playerState.discardPile,
      true, // Energy was attached this turn
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

