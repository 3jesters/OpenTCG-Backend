import { Match } from './match.entity';
import {
  MatchState,
  PlayerIdentifier,
  MatchResult,
  WinCondition,
  TurnPhase,
} from '../enums';
import { GameState, PlayerGameState } from '../value-objects';

describe('Match Entity', () => {
  describe('constructor', () => {
    it('should create a match with required fields', () => {
      const match = new Match('match-001', 'tournament-001');

      expect(match.id).toBe('match-001');
      expect(match.tournamentId).toBe('tournament-001');
      expect(match.state).toBe(MatchState.CREATED);
      expect(match.player1Id).toBeNull();
      expect(match.player2Id).toBeNull();
    });

    it('should throw error if id is empty', () => {
      expect(() => {
        new Match('', 'tournament-001');
      }).toThrow('Match ID is required');
    });

    it('should throw error if tournamentId is empty', () => {
      expect(() => {
        new Match('match-001', '');
      }).toThrow('Tournament ID is required');
    });
  });

  describe('assignPlayer', () => {
    it('should assign player 1 to match', () => {
      const match = new Match('match-001', 'tournament-001');

      match.assignPlayer('player-1', 'deck-1', PlayerIdentifier.PLAYER1);

      expect(match.player1Id).toBe('player-1');
      expect(match.player1DeckId).toBe('deck-1');
      expect(match.state).toBe(MatchState.WAITING_FOR_PLAYERS);
    });

    it('should assign player 2 and transition to DECK_VALIDATION', () => {
      const match = new Match('match-001', 'tournament-001');
      match.assignPlayer('player-1', 'deck-1', PlayerIdentifier.PLAYER1);

      match.assignPlayer('player-2', 'deck-2', PlayerIdentifier.PLAYER2);

      expect(match.player2Id).toBe('player-2');
      expect(match.player2DeckId).toBe('deck-2');
      expect(match.state).toBe(MatchState.DECK_VALIDATION);
    });

    it('should throw error if player 1 already assigned', () => {
      const match = new Match('match-001', 'tournament-001');
      match.assignPlayer('player-1', 'deck-1', PlayerIdentifier.PLAYER1);

      expect(() => {
        match.assignPlayer('player-3', 'deck-3', PlayerIdentifier.PLAYER1);
      }).toThrow('Player 1 is already assigned');
    });

    it('should throw error if assigning in invalid state', () => {
      const match = new Match('match-001', 'tournament-001');
      match.assignPlayer('player-1', 'deck-1', PlayerIdentifier.PLAYER1);
      match.assignPlayer('player-2', 'deck-2', PlayerIdentifier.PLAYER2);
      match.markDeckValidationComplete(true);
      match.approveMatch(PlayerIdentifier.PLAYER1);
      match.approveMatch(PlayerIdentifier.PLAYER2);
      match.setFirstPlayer(PlayerIdentifier.PLAYER1);

      expect(() => {
        match.assignPlayer('player-3', 'deck-3', PlayerIdentifier.PLAYER1);
      }).toThrow('Cannot assign player in state');
    });
  });

  describe('markDeckValidationComplete', () => {
    it('should transition to MATCH_APPROVAL when valid', () => {
      const match = new Match('match-001', 'tournament-001');
      match.assignPlayer('player-1', 'deck-1', PlayerIdentifier.PLAYER1);
      match.assignPlayer('player-2', 'deck-2', PlayerIdentifier.PLAYER2);

      match.markDeckValidationComplete(true);

      expect(match.state).toBe(MatchState.MATCH_APPROVAL);
    });

    it('should cancel match when invalid', () => {
      const match = new Match('match-001', 'tournament-001');
      match.assignPlayer('player-1', 'deck-1', PlayerIdentifier.PLAYER1);
      match.assignPlayer('player-2', 'deck-2', PlayerIdentifier.PLAYER2);

      match.markDeckValidationComplete(false);

      expect(match.state).toBe(MatchState.CANCELLED);
      expect(match.result).toBe(MatchResult.CANCELLED);
    });

    it('should throw error if not in DECK_VALIDATION state', () => {
      const match = new Match('match-001', 'tournament-001');

      expect(() => {
        match.markDeckValidationComplete(true);
      }).toThrow('Cannot mark deck validation complete in state');
    });
  });

  describe('setFirstPlayer', () => {
    it('should set first player and transition to DRAWING_CARDS', () => {
      const match = new Match('match-001', 'tournament-001');
      match.assignPlayer('player-1', 'deck-1', PlayerIdentifier.PLAYER1);
      match.assignPlayer('player-2', 'deck-2', PlayerIdentifier.PLAYER2);
      match.markDeckValidationComplete(true);
      match.approveMatch(PlayerIdentifier.PLAYER1);
      match.approveMatch(PlayerIdentifier.PLAYER2);

      match.setFirstPlayer(PlayerIdentifier.PLAYER1);

      expect(match.firstPlayer).toBe(PlayerIdentifier.PLAYER1);
      expect(match.currentPlayer).toBe(PlayerIdentifier.PLAYER1);
      expect(match.state).toBe(MatchState.DRAWING_CARDS);
    });

    it('should throw error if not in PRE_GAME_SETUP state', () => {
      const match = new Match('match-001', 'tournament-001');

      expect(() => {
        match.setFirstPlayer(PlayerIdentifier.PLAYER1);
      }).toThrow('Cannot set first player in state');
    });
  });

  describe('endMatch', () => {
    it('should end match with winner', () => {
      const match = new Match('match-001', 'tournament-001');
      match.assignPlayer('player-1', 'deck-1', PlayerIdentifier.PLAYER1);
      match.assignPlayer('player-2', 'deck-2', PlayerIdentifier.PLAYER2);

      match.endMatch('player-1', MatchResult.PLAYER1_WIN, WinCondition.PRIZE_CARDS);

      expect(match.state).toBe(MatchState.MATCH_ENDED);
      expect(match.winnerId).toBe('player-1');
      expect(match.result).toBe(MatchResult.PLAYER1_WIN);
      expect(match.winCondition).toBe(WinCondition.PRIZE_CARDS);
      expect(match.endedAt).not.toBeNull();
    });

    it('should throw error if winner is not a player', () => {
      const match = new Match('match-001', 'tournament-001');
      match.assignPlayer('player-1', 'deck-1', PlayerIdentifier.PLAYER1);
      match.assignPlayer('player-2', 'deck-2', PlayerIdentifier.PLAYER2);

      expect(() => {
        match.endMatch('player-3', MatchResult.PLAYER1_WIN, WinCondition.PRIZE_CARDS);
      }).toThrow('Winner ID must be one of the players');
    });

    it('should throw error if match already ended', () => {
      const match = new Match('match-001', 'tournament-001');
      match.assignPlayer('player-1', 'deck-1', PlayerIdentifier.PLAYER1);
      match.assignPlayer('player-2', 'deck-2', PlayerIdentifier.PLAYER2);
      match.endMatch('player-1', MatchResult.PLAYER1_WIN, WinCondition.PRIZE_CARDS);

      expect(() => {
        match.endMatch('player-2', MatchResult.PLAYER2_WIN, WinCondition.PRIZE_CARDS);
      }).toThrow('Cannot end match in state');
    });
  });

  describe('cancelMatch', () => {
    it('should cancel match with reason', () => {
      const match = new Match('match-001', 'tournament-001');

      match.cancelMatch('Player left');

      expect(match.state).toBe(MatchState.CANCELLED);
      expect(match.result).toBe(MatchResult.CANCELLED);
      expect(match.cancellationReason).toBe('Player left');
      expect(match.endedAt).not.toBeNull();
    });

    it('should throw error if match already ended', () => {
      const match = new Match('match-001', 'tournament-001');
      match.assignPlayer('player-1', 'deck-1', PlayerIdentifier.PLAYER1);
      match.assignPlayer('player-2', 'deck-2', PlayerIdentifier.PLAYER2);
      match.endMatch('player-1', MatchResult.PLAYER1_WIN, WinCondition.PRIZE_CARDS);

      expect(() => {
        match.cancelMatch('Reason');
      }).toThrow('Cannot cancel a match that has already ended');
    });
  });

  describe('isTerminal', () => {
    it('should return true for MATCH_ENDED state', () => {
      const match = new Match('match-001', 'tournament-001');
      match.assignPlayer('player-1', 'deck-1', PlayerIdentifier.PLAYER1);
      match.assignPlayer('player-2', 'deck-2', PlayerIdentifier.PLAYER2);
      match.endMatch('player-1', MatchResult.PLAYER1_WIN, WinCondition.PRIZE_CARDS);

      expect(match.isTerminal()).toBe(true);
    });

    it('should return true for CANCELLED state', () => {
      const match = new Match('match-001', 'tournament-001');
      match.cancelMatch('Reason');

      expect(match.isTerminal()).toBe(true);
    });

    it('should return false for active states', () => {
      const match = new Match('match-001', 'tournament-001');

      expect(match.isTerminal()).toBe(false);
    });
  });

  describe('getPlayerIdentifier', () => {
    it('should return PLAYER1 for player 1', () => {
      const match = new Match('match-001', 'tournament-001');
      match.assignPlayer('player-1', 'deck-1', PlayerIdentifier.PLAYER1);

      expect(match.getPlayerIdentifier('player-1')).toBe(PlayerIdentifier.PLAYER1);
    });

    it('should return PLAYER2 for player 2', () => {
      const match = new Match('match-001', 'tournament-001');
      match.assignPlayer('player-1', 'deck-1', PlayerIdentifier.PLAYER1);
      match.assignPlayer('player-2', 'deck-2', PlayerIdentifier.PLAYER2);

      expect(match.getPlayerIdentifier('player-2')).toBe(PlayerIdentifier.PLAYER2);
    });

    it('should return null for unknown player', () => {
      const match = new Match('match-001', 'tournament-001');

      expect(match.getPlayerIdentifier('unknown')).toBeNull();
    });
  });

  describe('getOpponentId', () => {
    it('should return opponent ID for player 1', () => {
      const match = new Match('match-001', 'tournament-001');
      match.assignPlayer('player-1', 'deck-1', PlayerIdentifier.PLAYER1);
      match.assignPlayer('player-2', 'deck-2', PlayerIdentifier.PLAYER2);

      expect(match.getOpponentId('player-1')).toBe('player-2');
    });

    it('should return opponent ID for player 2', () => {
      const match = new Match('match-001', 'tournament-001');
      match.assignPlayer('player-1', 'deck-1', PlayerIdentifier.PLAYER1);
      match.assignPlayer('player-2', 'deck-2', PlayerIdentifier.PLAYER2);

      expect(match.getOpponentId('player-2')).toBe('player-1');
    });

    it('should return null for unknown player', () => {
      const match = new Match('match-001', 'tournament-001');

      expect(match.getOpponentId('unknown')).toBeNull();
    });
  });
});

