import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { BaseActionHandler } from '../base-action-handler';
import { IActionHandler } from '../action-handler.interface';
import { ExecuteActionDto } from '../../dto';
import {
  Match,
  PlayerIdentifier,
  GameState,
  PlayerActionType,
  ActionSummary,
} from '../../../domain';
import { Card } from '../../../../card/domain/entities';
import { AbilityActionData } from '../../../domain/types/ability-action-data.types';
import { AbilityEffectExecutorService } from '../../../domain/services/effects/ability/ability-effect-executor.service';
import { AbilityEffectValidatorService } from '../../../domain/services/effects/ability/ability-effect-validator.service';
import { IMatchRepository } from '../../../domain/repositories';
import { MatchStateMachineService } from '../../../domain/services';
import { IGetCardByIdUseCase } from '../../../../card/application/ports/card-use-cases.interface';
import { v4 as uuidv4 } from 'uuid';

/**
 * Use Ability Action Handler
 * Handles using Pokemon abilities during MAIN_PHASE
 */
@Injectable()
export class UseAbilityActionHandler
  extends BaseActionHandler
  implements IActionHandler
{
  constructor(
    @Inject(IMatchRepository)
    protected readonly matchRepository: IMatchRepository,
    protected readonly stateMachineService: MatchStateMachineService,
    @Inject(IGetCardByIdUseCase)
    protected readonly getCardByIdUseCase: IGetCardByIdUseCase,
    private readonly abilityEffectExecutor: AbilityEffectExecutorService,
    private readonly abilityEffectValidator: AbilityEffectValidatorService,
  ) {
    super(matchRepository, stateMachineService, getCardByIdUseCase);
  }

  async execute(
    dto: ExecuteActionDto,
    match: Match,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    cardsMap: Map<string, Card>,
  ): Promise<Match> {
    const actionData = dto.actionData as unknown as AbilityActionData;
    const playerState = gameState.getPlayerState(playerIdentifier);

    if (!actionData.cardId) {
      throw new BadRequestException(
        'cardId is required for USE_ABILITY action',
      );
    }

    if (!actionData.target) {
      throw new BadRequestException(
        'target is required for USE_ABILITY action',
      );
    }

    // Get card domain entity (needed for ability with effects)
    const cardEntity = await this.getCardEntity(actionData.cardId, cardsMap);

    if (cardEntity.cardType !== 'POKEMON') {
      throw new BadRequestException('Card must be a Pokemon card');
    }

    const ability = cardEntity.ability;
    if (!ability) {
      throw new BadRequestException('Pokemon must have an ability');
    }

    // Get Pokemon instance from game state
    let pokemon: any | null = null;
    if (actionData.target === 'ACTIVE') {
      if (!playerState.activePokemon) {
        throw new BadRequestException('No active Pokemon found');
      }
      pokemon = playerState.activePokemon;
    } else {
      const benchIndex = parseInt(actionData.target.replace('BENCH_', ''));
      if (
        isNaN(benchIndex) ||
        benchIndex < 0 ||
        benchIndex >= playerState.bench.length
      ) {
        throw new BadRequestException(
          `Invalid bench position: ${actionData.target}`,
        );
      }
      pokemon = playerState.bench[benchIndex];
    }

    if (!pokemon) {
      throw new BadRequestException(
        'Pokemon not found at specified position',
      );
    }

    // Validate Pokemon matches cardId (or instanceId if provided)
    if (actionData.pokemonInstanceId) {
      if (pokemon.instanceId !== actionData.pokemonInstanceId) {
        throw new BadRequestException('Pokemon instanceId does not match');
      }
    } else {
      if (pokemon.cardId !== actionData.cardId) {
        throw new BadRequestException('Pokemon cardId does not match');
      }
    }

    // Validate ability can be used
    const validation =
      await this.abilityEffectValidator.validateAbilityUsage(
        ability,
        actionData,
        pokemon,
        gameState,
        playerIdentifier,
        cardsMap,
      );

    if (!validation.isValid) {
      throw new BadRequestException(
        `Invalid ability usage: ${validation.errors.join(', ')}`,
      );
    }

    // Execute ability effects
    const result = await this.abilityEffectExecutor.executeEffects(
      ability,
      actionData,
      gameState,
      playerIdentifier,
      cardsMap,
    );

    // Update game state
    const updatedGameState =
      playerIdentifier === PlayerIdentifier.PLAYER1
        ? gameState
            .withPlayer1State(result.playerState)
            .withPlayer2State(result.opponentState)
        : gameState
            .withPlayer2State(result.playerState)
            .withPlayer1State(result.opponentState);

    // Mark ability as used (for ONCE_PER_TURN tracking)
    const gameStateWithUsage = updatedGameState.markAbilityUsed(
      playerIdentifier,
      actionData.cardId,
    );

    const actionSummary = new ActionSummary(
      uuidv4(),
      playerIdentifier,
      PlayerActionType.USE_ABILITY,
      new Date(),
      actionData as unknown as Record<string, unknown>,
    );

    const finalGameState = gameStateWithUsage.withAction(actionSummary);
    match.updateGameState(finalGameState);

    return await this.matchRepository.save(match);
  }
}

