import { IsString, IsEnum } from 'class-validator';
import { PlayerIdentifier } from '../../domain/enums';

/**
 * Start Match Request DTO
 * Request body for starting a match
 */
export class StartMatchRequestDto {
  @IsString()
  playerId: string;

  @IsEnum(PlayerIdentifier)
  firstPlayer: PlayerIdentifier;
}
