import { Injectable, Inject } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import {
  Match,
  PlayerIdentifier,
  GameState,
  PlayerActionType,
  ActionSummary,
} from '../../domain';
import { IMatchRepository } from '../../domain/repositories';
import { EnergyAttachmentExecutionService } from './energy-attachment-execution.service';
import { v4 as uuidv4 } from 'uuid';

export interface AttachEnergyPlayerTurnParams {
  dto: any; // ExecuteActionDto
  match: Match;
  gameState: GameState;
  playerIdentifier: PlayerIdentifier;
}

@Injectable()
export class AttachEnergyPlayerTurnService {
  constructor(
    private readonly energyAttachmentExecutionService: EnergyAttachmentExecutionService,
    @Inject(IMatchRepository)
    private readonly matchRepository: IMatchRepository,
  ) {}

  /**
   * Execute attach energy action in PLAYER_TURN state
   */
  async executeAttachEnergy(
    params: AttachEnergyPlayerTurnParams,
  ): Promise<Match> {
    const { dto, match, gameState, playerIdentifier } = params;

    // Validate request
    const { energyCardId, target } = this.validateAttachEnergyRequest(
      dto.actionData,
    );

    // Execute energy attachment using execution service
    const result = this.energyAttachmentExecutionService.executeAttachEnergy({
      energyCardId,
      target,
      gameState,
      playerIdentifier,
    });

    // Create action summary
    const actionSummary = new ActionSummary(
      uuidv4(),
      playerIdentifier,
      PlayerActionType.ATTACH_ENERGY,
      new Date(),
      {
        energyCardId,
        target,
        targetInstanceId: result.targetInstanceId,
      },
    );

    const finalGameState = result.updatedGameState.withAction(actionSummary);

    // Update match
    match.updateGameState(finalGameState);

    return await this.matchRepository.save(match);
  }

  /**
   * Validate attach energy request
   */
  private validateAttachEnergyRequest(actionData: any): {
    energyCardId: string;
    target: string;
  } {
    const energyCardId = actionData?.energyCardId;
    const target = actionData?.target;

    if (!energyCardId) {
      throw new BadRequestException('energyCardId is required');
    }
    if (!target) {
      throw new BadRequestException('target is required');
    }

    return { energyCardId, target };
  }
}
