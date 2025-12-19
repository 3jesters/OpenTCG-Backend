import { Injectable, Inject } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import {
  GameState,
  PlayerGameState,
  CardInstance,
} from '../../domain/value-objects';
import { PlayerIdentifier, TurnPhase, PokemonPosition } from '../../domain/enums';
import { Card } from '../../../card/domain/entities';
import { CardType, EvolutionStage } from '../../../card/domain/enums';
import { IGetCardByIdUseCase } from '../../../card/application/ports/card-use-cases.interface';
import { v4 as uuidv4 } from 'uuid';

export interface PlayPokemonParams {
  cardId: string;
  gameState: GameState;
  playerIdentifier: PlayerIdentifier;
  getCardEntity: (cardId: string) => Promise<Card>;
  getCardHp: (cardId: string) => Promise<number>;
}

export interface PlayPokemonResult {
  updatedGameState: GameState;
  benchPosition: PokemonPosition;
  instanceId: string;
}

@Injectable()
export class PlayPokemonExecutionService {
  constructor(
    @Inject(IGetCardByIdUseCase)
    private readonly getCardByIdUseCase: IGetCardByIdUseCase,
  ) {}

  /**
   * Execute playing a Pokemon to the bench during main phase
   */
  async executePlayPokemon(
    params: PlayPokemonParams,
  ): Promise<PlayPokemonResult> {
    const { cardId, gameState, playerIdentifier, getCardEntity, getCardHp } =
      params;

    // Validate phase
    if (gameState.phase !== TurnPhase.MAIN_PHASE) {
      throw new BadRequestException(
        `Cannot play Pokemon in phase ${gameState.phase}. Must be MAIN_PHASE`,
      );
    }

    const playerState = gameState.getPlayerState(playerIdentifier);

    // Check if card is in hand
    if (!playerState.hand.includes(cardId)) {
      throw new BadRequestException('Card must be in hand');
    }

    // Validate that only Basic Pokemon can be played directly
    const cardEntity = await getCardEntity(cardId);
    if (cardEntity.cardType !== CardType.POKEMON) {
      throw new BadRequestException(
        'Only Pokemon cards can be played to the bench',
      );
    }
    if (cardEntity.stage !== EvolutionStage.BASIC) {
      throw new BadRequestException(
        `Cannot play ${cardEntity.stage} Pokemon directly. Only Basic Pokemon can be played to the bench. Evolved Pokemon must be evolved from their pre-evolution.`,
      );
    }

    // Check bench space (max 5)
    if (playerState.bench.length >= 5) {
      throw new BadRequestException('Bench is full (max 5 Pokemon)');
    }

    // Load card details to get HP
    const cardHp = await getCardHp(cardId);

    // Create CardInstance for bench Pokemon
    const benchPosition =
      `BENCH_${playerState.bench.length}` as PokemonPosition;
    const benchPokemon = new CardInstance(
      uuidv4(),
      cardId,
      benchPosition,
      cardHp,
      cardHp,
      [],
      [], // No status effects for new Pokemon
      [], // evolutionChain
      undefined, // poisonDamageAmount
      undefined, // evolvedAt - new Pokemon, not evolved
    );

    // Remove card from hand and add to bench
    const updatedHand = playerState.hand.filter((id) => id !== cardId);
    const updatedBench = [...playerState.bench, benchPokemon];
    const updatedPlayerState = new PlayerGameState(
      playerState.deck,
      updatedHand,
      playerState.activePokemon,
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
      benchPosition,
      instanceId: benchPokemon.instanceId,
    };
  }
}

