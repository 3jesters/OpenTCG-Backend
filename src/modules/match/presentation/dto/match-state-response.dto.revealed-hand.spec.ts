import { MatchStateResponseDto } from './match-state-response.dto';
import { Match, MatchState, PlayerIdentifier, TurnPhase } from '../../domain';
import { GameState, PlayerGameState } from '../../domain/value-objects';

describe('MatchStateResponseDto - Revealed Hand', () => {
  describe('fromDomain', () => {
    it('should include revealedHand in opponentState during INITIAL_SETUP', async () => {
      // Arrange
      const match = new Match('match-1', 'tournament-1');
      match.assignPlayer('player-1', 'deck-1', PlayerIdentifier.PLAYER1);
      match.assignPlayer('player-2', 'deck-2', PlayerIdentifier.PLAYER2);
      match.markDeckValidationComplete(true);
      match.approveMatch(PlayerIdentifier.PLAYER1);
      match.approveMatch(PlayerIdentifier.PLAYER2);

      const player1State = new PlayerGameState(
        ['card-1', 'card-2'],
        ['hand-card-1', 'hand-card-2', 'hand-card-3'],
        null,
        [],
        ['prize-1', 'prize-2', 'prize-3', 'prize-4', 'prize-5', 'prize-6'],
        [],
        false,
      );

      const player2State = new PlayerGameState(
        ['card-3', 'card-4'],
        ['opponent-hand-1', 'opponent-hand-2', 'opponent-hand-3'],
        null,
        [],
        ['prize-1', 'prize-2', 'prize-3', 'prize-4', 'prize-5', 'prize-6'],
        [],
        false,
      );

      const gameState = new GameState(
        player1State,
        player2State,
        1,
        TurnPhase.DRAW,
        PlayerIdentifier.PLAYER1,
        null,
        [],
      );

      // After both players approve, match automatically transitions to DRAWING_CARDS
      // So we don't need to call setFirstPlayer (it's deprecated anyway)
      match.updateGameStateDuringDrawing(gameState);
      // Manually transition to INITIAL_SETUP for testing legacy state
      (match as any)._state = MatchState.INITIAL_SETUP;

      // Act
      const dto = await MatchStateResponseDto.fromDomain(match, 'player-1');

      // Assert
      expect(dto.state).toBe(MatchState.INITIAL_SETUP);
      expect(dto.opponentState.revealedHand).toBeDefined();
      expect(dto.opponentState.revealedHand).toEqual([
        'opponent-hand-1',
        'opponent-hand-2',
        'opponent-hand-3',
      ]);
    });

    it('should not include revealedHand in opponentState after INITIAL_SETUP', async () => {
      // Arrange
      const match = new Match('match-1', 'tournament-1');
      match.assignPlayer('player-1', 'deck-1', PlayerIdentifier.PLAYER1);
      match.assignPlayer('player-2', 'deck-2', PlayerIdentifier.PLAYER2);
      match.markDeckValidationComplete(true);
      match.approveMatch(PlayerIdentifier.PLAYER1);
      match.approveMatch(PlayerIdentifier.PLAYER2);

      const player1State = new PlayerGameState(
        ['card-1', 'card-2'],
        ['hand-card-1', 'hand-card-2'],
        null,
        [],
        ['prize-1', 'prize-2', 'prize-3', 'prize-4', 'prize-5', 'prize-6'],
        [],
        false,
      );

      const player2State = new PlayerGameState(
        ['card-3', 'card-4'],
        ['opponent-hand-1', 'opponent-hand-2'],
        null,
        [],
        ['prize-1', 'prize-2', 'prize-3', 'prize-4', 'prize-5', 'prize-6'],
        [],
        false,
      );

      const gameState = new GameState(
        player1State,
        player2State,
        1,
        TurnPhase.DRAW,
        PlayerIdentifier.PLAYER1,
        null,
        [],
      );

      // After both players approve, match automatically transitions to DRAWING_CARDS
      // So we don't need to call setFirstPlayer (it's deprecated anyway)
      match.updateGameStateDuringDrawing(gameState);
      // Manually transition to INITIAL_SETUP for testing legacy state
      (match as any)._state = MatchState.INITIAL_SETUP;
      // Move to next state (not INITIAL_SETUP)
      (match as any)._state = MatchState.PLAYER_TURN;

      // Act
      const dto = await MatchStateResponseDto.fromDomain(match, 'player-1');

      // Assert
      expect(dto.state).not.toBe(MatchState.INITIAL_SETUP);
      expect(dto.opponentState.revealedHand).toBeUndefined();
    });

    it('should show revealedHand for player 2 when viewing from player 1 perspective', async () => {
      // Arrange
      const match = new Match('match-1', 'tournament-1');
      match.assignPlayer('player-1', 'deck-1', PlayerIdentifier.PLAYER1);
      match.assignPlayer('player-2', 'deck-2', PlayerIdentifier.PLAYER2);
      match.markDeckValidationComplete(true);
      match.approveMatch(PlayerIdentifier.PLAYER1);
      match.approveMatch(PlayerIdentifier.PLAYER2);

      const player1State = new PlayerGameState(
        ['card-1'],
        ['player1-hand-1', 'player1-hand-2'],
        null,
        [],
        ['prize-1', 'prize-2', 'prize-3', 'prize-4', 'prize-5', 'prize-6'],
        [],
        false,
      );

      const player2State = new PlayerGameState(
        ['card-2'],
        ['player2-hand-1', 'player2-hand-2', 'player2-hand-3'],
        null,
        [],
        ['prize-1', 'prize-2', 'prize-3', 'prize-4', 'prize-5', 'prize-6'],
        [],
        false,
      );

      const gameState = new GameState(
        player1State,
        player2State,
        1,
        TurnPhase.DRAW,
        PlayerIdentifier.PLAYER1,
        null,
        [],
      );

      // After both players approve, match automatically transitions to DRAWING_CARDS
      // So we don't need to call setFirstPlayer (it's deprecated anyway)
      match.updateGameStateDuringDrawing(gameState);
      // Manually transition to INITIAL_SETUP for testing legacy state
      (match as any)._state = MatchState.INITIAL_SETUP;

      // Act
      const dto = await MatchStateResponseDto.fromDomain(match, 'player-1');

      // Assert
      expect(dto.opponentState.revealedHand).toEqual([
        'player2-hand-1',
        'player2-hand-2',
        'player2-hand-3',
      ]);
    });

    it('should show revealedHand for player 1 when viewing from player 2 perspective', async () => {
      // Arrange
      const match = new Match('match-1', 'tournament-1');
      match.assignPlayer('player-1', 'deck-1', PlayerIdentifier.PLAYER1);
      match.assignPlayer('player-2', 'deck-2', PlayerIdentifier.PLAYER2);
      match.markDeckValidationComplete(true);
      match.approveMatch(PlayerIdentifier.PLAYER1);
      match.approveMatch(PlayerIdentifier.PLAYER2);

      const player1State = new PlayerGameState(
        ['card-1'],
        ['player1-hand-1', 'player1-hand-2', 'player1-hand-3'],
        null,
        [],
        ['prize-1', 'prize-2', 'prize-3', 'prize-4', 'prize-5', 'prize-6'],
        [],
        false,
      );

      const player2State = new PlayerGameState(
        ['card-2'],
        ['player2-hand-1', 'player2-hand-2'],
        null,
        [],
        ['prize-1', 'prize-2', 'prize-3', 'prize-4', 'prize-5', 'prize-6'],
        [],
        false,
      );

      const gameState = new GameState(
        player1State,
        player2State,
        1,
        TurnPhase.DRAW,
        PlayerIdentifier.PLAYER1,
        null,
        [],
      );

      // After both players approve, match automatically transitions to DRAWING_CARDS
      // So we don't need to call setFirstPlayer (it's deprecated anyway)
      match.updateGameStateDuringDrawing(gameState);
      // Manually transition to INITIAL_SETUP for testing legacy state
      (match as any)._state = MatchState.INITIAL_SETUP;

      // Act
      const dto = await MatchStateResponseDto.fromDomain(match, 'player-2');

      // Assert
      expect(dto.opponentState.revealedHand).toEqual([
        'player1-hand-1',
        'player1-hand-2',
        'player1-hand-3',
      ]);
    });

    it('should not include revealedHand when opponentState is empty', async () => {
      // Arrange
      const match = new Match('match-1', 'tournament-1');
      match.assignPlayer('player-1', 'deck-1', PlayerIdentifier.PLAYER1);
      match.assignPlayer('player-2', 'deck-2', PlayerIdentifier.PLAYER2);
      match.markDeckValidationComplete(true);
      match.approveMatch(PlayerIdentifier.PLAYER1);
      match.approveMatch(PlayerIdentifier.PLAYER2);

      const player1State = new PlayerGameState(
        ['card-1'],
        ['hand-1', 'hand-2'],
        null,
        [],
        ['prize-1', 'prize-2', 'prize-3', 'prize-4', 'prize-5', 'prize-6'],
        [],
      );

      const gameState = new GameState(
        player1State,
        null as any,
        1,
        TurnPhase.DRAW,
        PlayerIdentifier.PLAYER1,
        null,
        [],
      );

      // After both players approve, match automatically transitions to DRAWING_CARDS
      // So we don't need to call setFirstPlayer (it's deprecated anyway)
      match.updateGameStateDuringDrawing(gameState);
      // Manually transition to INITIAL_SETUP for testing legacy state
      (match as any)._state = MatchState.INITIAL_SETUP;

      // Act
      const dto = await MatchStateResponseDto.fromDomain(match, 'player-1');

      // Assert
      expect(dto.opponentState.revealedHand).toBeUndefined();
    });

    it('should show empty revealedHand when opponent has no cards in hand', async () => {
      // Arrange
      const match = new Match('match-1', 'tournament-1');
      match.assignPlayer('player-1', 'deck-1', PlayerIdentifier.PLAYER1);
      match.assignPlayer('player-2', 'deck-2', PlayerIdentifier.PLAYER2);
      match.markDeckValidationComplete(true);
      match.approveMatch(PlayerIdentifier.PLAYER1);
      match.approveMatch(PlayerIdentifier.PLAYER2);

      const player1State = new PlayerGameState(
        ['card-1'],
        ['hand-1', 'hand-2'],
        null,
        [],
        ['prize-1', 'prize-2', 'prize-3', 'prize-4', 'prize-5', 'prize-6'],
        [],
        false,
      );

      const player2State = new PlayerGameState(
        ['card-2'],
        [], // Empty hand
        null,
        [],
        ['prize-1', 'prize-2', 'prize-3', 'prize-4', 'prize-5', 'prize-6'],
        [],
        false,
      );

      const gameState = new GameState(
        player1State,
        player2State,
        1,
        TurnPhase.DRAW,
        PlayerIdentifier.PLAYER1,
        null,
        [],
      );

      // After both players approve, match automatically transitions to DRAWING_CARDS
      // So we don't need to call setFirstPlayer (it's deprecated anyway)
      match.updateGameStateDuringDrawing(gameState);
      // Manually transition to INITIAL_SETUP for testing legacy state
      (match as any)._state = MatchState.INITIAL_SETUP;

      // Act
      const dto = await MatchStateResponseDto.fromDomain(match, 'player-1');

      // Assert
      expect(dto.opponentState.revealedHand).toEqual([]);
    });
  });
});
