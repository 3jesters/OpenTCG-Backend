import { Match } from '../../domain';
import { MatchResponseDto } from './match-response.dto';

/**
 * Match List Response DTO
 * Response DTO for listing multiple matches
 */
export class MatchListResponseDto {
  matches: MatchResponseDto[];
  count: number;

  static fromDomain(matches: Match[]): MatchListResponseDto {
    return {
      matches: matches.map((match) => MatchResponseDto.fromDomain(match)),
      count: matches.length,
    };
  }
}

