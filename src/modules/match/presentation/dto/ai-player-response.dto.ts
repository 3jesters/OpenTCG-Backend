/**
 * AI Player Response DTO
 * Response DTO for AI player information
 */
export class AiPlayerResponseDto {
  id: string;
  name: string;
  version: string;
  description?: string;

  static fromConfig(config: {
    id: string;
    name: string;
    version: string;
    description?: string;
  }): AiPlayerResponseDto {
    return {
      id: config.id,
      name: config.name,
      version: config.version,
      description: config.description,
    };
  }

  static fromConfigArray(
    configs: Array<{
      id: string;
      name: string;
      version: string;
      description?: string;
    }>,
  ): AiPlayerResponseDto[] {
    return configs.map((config) => this.fromConfig(config));
  }
}
