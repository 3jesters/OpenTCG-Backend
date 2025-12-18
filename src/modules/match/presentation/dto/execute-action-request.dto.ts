import { IsString, IsEnum, IsObject } from 'class-validator';
import { PlayerActionType } from '../../domain/enums';

/**
 * Execute Action Request DTO
 * Request body for executing a player action
 */
export class ExecuteActionRequestDto {
  @IsString()
  playerId: string;

  @IsEnum(PlayerActionType)
  actionType: PlayerActionType;

  @IsObject()
  actionData: Record<string, unknown>;
}
