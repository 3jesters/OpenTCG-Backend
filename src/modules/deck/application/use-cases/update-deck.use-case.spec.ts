import { UpdateDeckUseCase } from './update-deck.use-case';
import { IDeckRepository } from '../../domain/repositories';
import { Deck } from '../../domain';
import { NotFoundException } from '@nestjs/common';

describe('UpdateDeckUseCase', () => {
  let useCase: UpdateDeckUseCase;
  let mockRepository: jest.Mocked<IDeckRepository>;

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
      findByCreator: jest.fn(),
    };

    useCase = new UpdateDeckUseCase(mockRepository);
  });

  it('should update deck name', async () => {
    const mockDeck = new Deck('deck-1', 'Old Name', 'player-1');
    mockRepository.findById.mockResolvedValue(mockDeck);
    mockRepository.save.mockImplementation(async (deck) => deck);

    const result = await useCase.execute('deck-1', { name: 'New Name' });

    expect(result.name).toBe('New Name');
    expect(mockRepository.save).toHaveBeenCalled();
  });

  it('should update tournament ID', async () => {
    const mockDeck = new Deck('deck-1', 'My Deck', 'player-1');
    mockRepository.findById.mockResolvedValue(mockDeck);
    mockRepository.save.mockImplementation(async (deck) => deck);

    const result = await useCase.execute('deck-1', {
      tournamentId: 'tournament-1',
    });

    expect(result.tournamentId).toBe('tournament-1');
  });

  it('should replace cards when provided', async () => {
    const mockDeck = new Deck('deck-1', 'My Deck', 'player-1');
    mockDeck.addCard('card-old', 'Base Set', 4);
    mockRepository.findById.mockResolvedValue(mockDeck);
    mockRepository.save.mockImplementation(async (deck) => deck);

    const result = await useCase.execute('deck-1', {
      cards: [{ cardId: 'card-new', setName: 'Jungle', quantity: 2 }],
    });

    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].cardId).toBe('card-new');
  });

  it('should not update fields when not provided', async () => {
    const mockDeck = new Deck(
      'deck-1',
      'My Deck',
      'player-1',
      [],
      undefined,
      'tournament-1',
    );
    mockRepository.findById.mockResolvedValue(mockDeck);
    mockRepository.save.mockImplementation(async (deck) => deck);

    const result = await useCase.execute('deck-1', {});

    expect(result.name).toBe('My Deck');
    expect(result.tournamentId).toBe('tournament-1');
  });

  it('should throw NotFoundException when deck not found', async () => {
    mockRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('deck-1', { name: 'New Name' }),
    ).rejects.toThrow(NotFoundException);
  });
});
