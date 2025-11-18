import { LoadSetResultDto } from './load-set-result.dto';

/**
 * Load Cards Response DTO
 * Response from loading one or multiple card sets
 */
export class LoadCardsResponseDto {
  success: boolean;
  totalLoaded: number;
  results: LoadSetResultDto[];
}

