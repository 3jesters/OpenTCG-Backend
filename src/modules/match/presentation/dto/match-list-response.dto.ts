import { Match } from '../../domain';
import { MatchResponseDto } from './match-response.dto';

/**
 * Match List Response DTO
 * Response DTO for listing multiple matches
 */
export class MatchListResponseDto {
  matches: MatchResponseDto[];
  count: number;

  constructor(matches: MatchResponseDto[], count: number) {
    this.matches = matches;
    this.count = count;
  }

  static fromDomain(matches: Match[]): MatchListResponseDto {
    return new MatchListResponseDto(
      matches.map((match) => MatchResponseDto.fromDomain(match)),
      matches.length,
    );
  }
}
