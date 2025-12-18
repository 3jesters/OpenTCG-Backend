import { CreateDeckUseCase } from './create-deck.use-case';
import { IDeckRepository } from '../../domain/repositories';
import { Deck } from '../../domain';

describe('CreateDeckUseCase', () => {
  let useCase: CreateDeckUseCase;
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

    useCase = new CreateDeckUseCase(mockRepository);
  });

  it('should create a deck with basic information', async () => {
    const dto = {
      name: 'My Deck',
      createdBy: 'player-1',
    };

    mockRepository.save.mockImplementation(async (deck) => deck);

    const result = await useCase.execute(dto);

    expect(result).toBeInstanceOf(Deck);
    expect(result.name).toBe('My Deck');
    expect(result.createdBy).toBe('player-1');
    expect(result.cards).toHaveLength(0);
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
  });

  it('should create a deck with cards', async () => {
    const dto = {
      name: 'My Deck',
      createdBy: 'player-1',
      cards: [
        { cardId: 'card-1', setName: 'Base Set', quantity: 4 },
        { cardId: 'card-2', setName: 'Jungle', quantity: 2 },
      ],
    };

    mockRepository.save.mockImplementation(async (deck) => deck);

    const result = await useCase.execute(dto);

    expect(result.cards).toHaveLength(2);
    expect(result.cards[0].cardId).toBe('card-1');
    expect(result.cards[0].quantity).toBe(4);
  });

  it('should create a deck with tournament ID', async () => {
    const dto = {
      name: 'My Deck',
      createdBy: 'player-1',
      tournamentId: 'tournament-1',
    };

    mockRepository.save.mockImplementation(async (deck) => deck);

    const result = await useCase.execute(dto);

    expect(result.tournamentId).toBe('tournament-1');
  });

  it('should generate a unique ID', async () => {
    const dto = {
      name: 'My Deck',
      createdBy: 'player-1',
    };

    mockRepository.save.mockImplementation(async (deck) => deck);

    const result1 = await useCase.execute(dto);
    const result2 = await useCase.execute(dto);

    expect(result1.id).toBeDefined();
    expect(result2.id).toBeDefined();
    expect(result1.id).not.toBe(result2.id);
  });

  it('should call repository save with created deck', async () => {
    const dto = {
      name: 'My Deck',
      createdBy: 'player-1',
    };

    mockRepository.save.mockImplementation(async (deck) => deck);

    await useCase.execute(dto);

    expect(mockRepository.save).toHaveBeenCalledTimes(1);
    const savedDeck = mockRepository.save.mock.calls[0][0];
    expect(savedDeck).toBeInstanceOf(Deck);
    expect(savedDeck.name).toBe('My Deck');
  });
});
