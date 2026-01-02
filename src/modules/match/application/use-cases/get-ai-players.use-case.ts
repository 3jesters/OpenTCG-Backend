import { Injectable } from '@nestjs/common';
import { AI_PLAYERS, AiPlayerConfig } from '../../domain/constants/ai-player.constants';

/**
 * Get AI Players Use Case
 * Returns the list of available AI players
 */
@Injectable()
export class GetAiPlayersUseCase {
  async execute(): Promise<AiPlayerConfig[]> {
    return AI_PLAYERS;
  }
}


