import { TournamentResponseDto } from './tournament-response.dto';
import { Tournament } from '../../domain';

/**
 * Tournament List Response DTO
 * Returns a list of tournaments
 */
export class TournamentListResponseDto {
  tournaments: TournamentResponseDto[];
  total: number;

  static fromDomain(tournaments: Tournament[]): TournamentListResponseDto {
    return {
      tournaments: tournaments.map((t) => TournamentResponseDto.fromDomain(t)),
      total: tournaments.length,
    };
  }
}

