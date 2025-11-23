import { PlayerActionType } from '../../domain/enums';

/**
 * Execute Action DTO
 * Data transfer object for executing a player action
 */
export class ExecuteActionDto {
  matchId: string;
  playerId: string;
  actionType: PlayerActionType;
  actionData: Record<string, unknown>;
}

