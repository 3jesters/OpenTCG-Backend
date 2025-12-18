import { IsString } from 'class-validator';

/**
 * Get Match State Request DTO
 * Request body for getting match state
 */
export class GetMatchStateRequestDto {
  @IsString()
  playerId: string;
}
