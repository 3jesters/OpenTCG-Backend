/**
 * AI Player Configuration
 */
export interface AiPlayerConfig {
  id: string;
  name: string;
  version: string;
  description?: string;
}

/**
 * Available AI Players
 * This list can be expanded as more AI versions are added
 */
export const AI_PLAYERS: AiPlayerConfig[] = [
  {
    id: 'AIPlayerV0.1',
    name: 'AI Player V0.1',
    version: '0.1',
    description: 'Basic AI player with strategic decision-making',
  },
];

/**
 * Get AI player by ID
 */
export function getAiPlayerById(id: string): AiPlayerConfig | undefined {
  return AI_PLAYERS.find((player) => player.id === id);
}

/**
 * Check if a player ID is an AI player
 */
export function isAiPlayerId(playerId: string): boolean {
  return AI_PLAYERS.some((player) => player.id === playerId);
}

/**
 * Default AI Player ID (for backward compatibility)
 */
export const AI_PLAYER_ID = AI_PLAYERS[0].id;


