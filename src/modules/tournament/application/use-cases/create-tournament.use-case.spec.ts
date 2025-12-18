import { ConflictException } from '@nestjs/common';
import { CreateTournamentUseCase } from './create-tournament.use-case';
import {
  ITournamentRepository,
  Tournament,
  TournamentStatus,
} from '../../domain';
import { CreateTournamentDto } from '../dto/create-tournament.dto';

describe('CreateTournamentUseCase', () => {
  let useCase: CreateTournamentUseCase;
  let mockRepository: jest.Mocked<ITournamentRepository>;

  beforeEach(() => {
    mockRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    useCase = new CreateTournamentUseCase(mockRepository);
  });

  describe('execute', () => {
    it('should create a tournament with minimum required fields', async () => {
      const dto: CreateTournamentDto = {
        id: 'test-tournament',
        name: 'Test Tournament',
        version: '1.0',
        description: 'Test description',
        author: 'test-author',
        deckRules: {
          minDeckSize: 60,
          maxDeckSize: 60,
          exactDeckSize: true,
          maxCopiesPerCard: 4,
          minBasicPokemon: 1,
        },
      };

      mockRepository.findById.mockResolvedValue(null);
      mockRepository.save.mockImplementation((t) => Promise.resolve(t));

      const result = await useCase.execute(dto);

      expect(result.id).toBe('test-tournament');
      expect(result.name).toBe('Test Tournament');
      expect(mockRepository.findById).toHaveBeenCalledWith('test-tournament');
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should create a tournament with all optional fields', async () => {
      const dto: CreateTournamentDto = {
        id: 'test-tournament',
        name: 'Test Tournament',
        version: '1.0',
        description: 'Test description',
        author: 'test-author',
        official: true,
        status: TournamentStatus.ACTIVE,
        bannedSets: ['unwanted-set'],
        setBannedCards: {
          'base-set': ['banned-card-1'],
        },
        deckRules: {
          minDeckSize: 60,
          maxDeckSize: 60,
          exactDeckSize: true,
          maxCopiesPerCard: 4,
          minBasicPokemon: 1,
          restrictedCards: [
            {
              setName: 'base-set',
              cardId: 'alakazam-base-1',
              maxCopies: 1,
            },
          ],
        },
        savedDecks: ['deck-1'],
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-12-31T23:59:59.999Z',
        maxParticipants: 64,
        format: 'Standard',
        regulationMarks: ['A', 'B'],
      };

      mockRepository.findById.mockResolvedValue(null);
      mockRepository.save.mockImplementation((t) => Promise.resolve(t));

      const result = await useCase.execute(dto);

      expect(result.official).toBe(true);
      expect(result.status).toBe(TournamentStatus.ACTIVE);
      expect(result.bannedSets).toContain('unwanted-set');
      expect(result.setBannedCards['base-set']).toContain('banned-card-1');
      expect(result.savedDecks).toContain('deck-1');
      expect(result.format).toBe('Standard');
      expect(result.regulationMarks).toContain('A');
    });

    it('should throw ConflictException if tournament ID already exists', async () => {
      const dto: CreateTournamentDto = {
        id: 'existing-tournament',
        name: 'Test Tournament',
        version: '1.0',
        description: 'Test description',
        author: 'test-author',
        deckRules: {
          minDeckSize: 60,
          maxDeckSize: 60,
          exactDeckSize: true,
          maxCopiesPerCard: 4,
          minBasicPokemon: 1,
        },
      };

      const existingTournament = Tournament.createDefault();
      mockRepository.findById.mockResolvedValue(existingTournament);

      await expect(useCase.execute(dto)).rejects.toThrow(ConflictException);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });
});
