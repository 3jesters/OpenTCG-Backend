import { Injectable, BadRequestException } from '@nestjs/common';
import { BaseActionHandler } from '../base-action-handler';
import { IActionHandler } from '../action-handler.interface';
import { ExecuteActionDto } from '../../dto';
import {
  Match,
  PlayerIdentifier,
  GameState,
  MatchState,
  PokemonPosition,
} from '../../../domain';
import { Card } from '../../../../card/domain/entities';
import { CardInstance, PlayerGameState } from '../../../domain/value-objects';
import { CardType } from '../../../../card/domain/enums/card-type.enum';
import { EvolutionStage } from '../../../../card/domain/enums/evolution-stage.enum';
import { TrainerEffectType } from '../../../../card/domain/enums/trainer-effect-type.enum';
import { TargetType } from '../../../../card/domain/enums/target-type.enum';
import { v4 as uuidv4 } from 'uuid';

/**
 * Play Pokemon Setup Action Handler
 * Handles playing Pokemon to bench during initial setup (SELECT_BENCH_POKEMON state)
 */
@Injectable()
export class PlayPokemonSetupActionHandler
  extends BaseActionHandler
  implements IActionHandler
{
  async execute(
    dto: ExecuteActionDto,
    match: Match,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    cardsMap: Map<string, Card>,
  ): Promise<Match> {
    // Only handle setup phase
    if (match.state !== MatchState.SELECT_BENCH_POKEMON) {
      throw new BadRequestException(
        `This handler only handles PLAY_POKEMON in SELECT_BENCH_POKEMON state. Current state: ${match.state}`,
      );
    }

    const cardId = (dto.actionData as any)?.cardId;
    if (!cardId) {
      throw new BadRequestException('cardId is required');
    }

    const playerState = gameState.getPlayerState(playerIdentifier);

    // Check if card is in hand
    if (!playerState.hand.includes(cardId)) {
      throw new BadRequestException('Card must be in hand');
    }

    // Validate that only Basic Pokemon can be played directly
    // Exception: Trainer cards with PUT_INTO_PLAY effect (source: HAND, target: SELF) can be played as Basic Pokemon
    // Examples: Clefairy Doll, Mysterious Fossil
    const cardEntity = await this.getCardEntity(cardId, cardsMap);

    // Check if it's a special trainer card that can be played as Basic Pokemon
    const isSpecialTrainerCard =
      cardEntity.cardType === CardType.TRAINER &&
      cardEntity.trainerEffects.some(
        (effect) =>
          effect.effectType === TrainerEffectType.PUT_INTO_PLAY &&
          effect.source === 'HAND' &&
          effect.target === TargetType.SELF,
      );

    if (!isSpecialTrainerCard) {
      // For non-special trainer cards, must be a Basic Pokemon
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
    }

    // Check bench space (max 5)
    if (playerState.bench.length >= 5) {
      throw new BadRequestException('Bench is full (max 5 Pokemon)');
    }

    // Load card details to get HP
    const cardHp = this.getCardHp(cardEntity);

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
      [],
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

    match.updateGameStateDuringSetup(updatedGameState);

    return await this.matchRepository.save(match);
  }
}

