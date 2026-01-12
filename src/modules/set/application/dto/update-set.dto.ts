import { IsString, IsOptional } from 'class-validator';

/**
 * DTO for updating an existing set
 * All fields are optional for partial updates
 */
export class UpdateSetDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  symbolUrl?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;
}
