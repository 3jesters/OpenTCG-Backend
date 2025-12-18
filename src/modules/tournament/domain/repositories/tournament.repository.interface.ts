import { Tournament } from '../entities';

/**
 * Tournament Repository Interface
 * Defines contract for tournament persistence
 */
export interface ITournamentRepository {
  findAll(): Promise<Tournament[]>;
  findById(id: string): Promise<Tournament | null>;
  save(tournament: Tournament): Promise<Tournament>;
  delete(id: string): Promise<void>;
}

export const ITournamentRepository = Symbol('ITournamentRepository');
