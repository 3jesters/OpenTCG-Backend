import { IsString } from 'class-validator';

/**
 * Load Set Request DTO
 * Represents a single set to be loaded
 */
export class LoadSetRequestDto {
  @IsString()
  author: string;

  @IsString()
  setName: string;

  @IsString()
  version: string;
}

