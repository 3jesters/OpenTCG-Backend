import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { Match, PlayerIdentifier, PlayerActionType } from '../../domain';
import { IMatchRepository } from '../../domain/repositories';
import { ExecuteActionRequestDto } from '../../presentation/dto';
import { ExecuteActionDto } from '../dto';
import { ExecuteTurnActionUseCase } from './execute-turn-action.use-case';
import { PlayerTypeService } from '../services';
import {
  IAiActionGeneratorService,
} from '../ports/ai-action-generator.interface';

/**
 * Process Action Use Case
 * Orchestrates the player/computer distinction and delegates to ExecuteTurnActionUseCase
 */
@Injectable()
export class ProcessActionUseCase {
  constructor(
    @Inject(IMatchRepository)
    private readonly matchRepository: IMatchRepository,
    private readonly playerTypeService: PlayerTypeService,
    @Optional()
    @Inject(IAiActionGeneratorService)
    private readonly aiActionGeneratorService: IAiActionGeneratorService | null,
    private readonly executeTurnActionUseCase: ExecuteTurnActionUseCase,
  ) {}

  /**
   * Process an action request (from player or AI)
   * @param requestDto - The action request DTO
   * @returns Match and available actions
   */
  async execute(
    requestDto: ExecuteActionRequestDto,
    matchId: string,
  ): Promise<{ match: Match; availableActions: PlayerActionType[] }> {
    // Get match
    const match = await this.matchRepository.findById(matchId);
    if (!match) {
      throw new NotFoundException(`Match with ID ${matchId} not found`);
    }

    // Get player identifier
    const playerIdentifier = match.getPlayerIdentifier(requestDto.playerId);
    if (!playerIdentifier) {
      throw new BadRequestException('Player is not part of this match');
    }

    // Check if player is AI or human
    const isAi = this.playerTypeService.isAiPlayer(requestDto.playerId);

    let executeActionDto: ExecuteActionDto;

    if (isAi) {
      // AI player - generate action using AI service
      if (!this.aiActionGeneratorService) {
        throw new BadRequestException(
          'AI action generation is not available',
        );
      }

      executeActionDto = await this.aiActionGeneratorService.generateAction(
        match,
        requestDto.playerId,
        playerIdentifier,
      );
    } else {
      // Human player - use action from request
      executeActionDto = {
        matchId,
        playerId: requestDto.playerId,
        actionType: requestDto.actionType,
        actionData: requestDto.actionData,
      };
    }

    // Execute the action using ExecuteTurnActionUseCase
    return await this.executeTurnActionUseCase.execute(executeActionDto);
  }
}

