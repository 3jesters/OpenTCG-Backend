import axios from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';

interface CardSetFile {
  metadata: {
    author: string;
    setName: string;
    version: string;
  };
  cards: Array<{
    name: string;
    cardNumber: string;
    pokemonNumber?: string;
    cardType?: string;
    level?: number;
    [key: string]: any;
  }>;
}

interface PokemonTCGCard {
  id: string;
  name: string;
  number: string;
  level?: string;
  [key: string]: any;
}

interface PokemonTCGResponse {
  data: PokemonTCGCard[];
  page?: number;
  pageSize?: number;
  totalCount?: number;
}

/**
 * Fetch card levels from Pokemon TCG API (pokemontcg.io)
 * This is an alternative to scraping pikawiz.com
 */
async function fetchLevelsFromAPI() {
  const sets = [
    { name: 'base-set', apiSetId: 'base1', file: 'pokemon-base-set-v1.0.json' },
    { name: 'jungle', apiSetId: 'base2', file: 'pokemon-jungle-v1.0.json' },
    { name: 'fossil', apiSetId: 'base3', file: 'pokemon-fossil-v1.0.json' },
  ];

  console.log('🚀 Fetching card levels from Pokemon TCG API...\n');

  for (const set of sets) {
    console.log(`\n📦 Processing ${set.name} set (API set: ${set.apiSetId})...`);

    try {
      // Fetch all cards from the set
      const apiUrl = `https://api.pokemontcg.io/v2/cards?q=set.id:${set.apiSetId}`;
      console.log(`  Fetching from: ${apiUrl}`);

      // Try with retries and longer timeout
      let response: axios.AxiosResponse<PokemonTCGResponse> | null = null;
      let retries = 3;
      while (retries > 0) {
        try {
          response = await axios.get<PokemonTCGResponse>(apiUrl, {
            headers: {
              'X-Api-Key': process.env.POKEMON_TCG_API_KEY || '', // Optional API key
            },
            timeout: 60000, // Increased timeout
          });
          break;
        } catch (error: any) {
          retries--;
          if (retries === 0) throw error;
          console.log(`  ⚠️  Request failed, retrying... (${retries} attempts left)`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      if (!response) {
        throw new Error('Failed to fetch data after retries');
      }

      const apiCards = response.data.data;
      console.log(`  Found ${apiCards.length} cards in API response`);

      // Read the JSON file
      const jsonPath = path.resolve(__dirname, '..', 'data', 'cards', set.file);
      const jsonContent = await fs.readFile(jsonPath, 'utf-8');
      const jsonData: CardSetFile = JSON.parse(jsonContent);

      // Helper function to normalize card names for matching
      const normalizeName = (name: string): string => {
        return name
          .toLowerCase()
          .trim()
          .replace(/[^\w\s]/g, '')
          .replace(/\s+/g, ' ')
          .trim();
      };

      // Create a map of API cards by normalized name
      const apiCardMap = new Map<string, PokemonTCGCard>();
      apiCards.forEach((apiCard) => {
        const normalized = normalizeName(apiCard.name);
        apiCardMap.set(normalized, apiCard);
      });

      // Update cards with level data
      let updatedCount = 0;
      let notFound: string[] = [];

      for (const card of jsonData.cards) {
        // Only update Pokemon cards
        if (card.cardType && card.cardType !== 'POKEMON') {
          continue;
        }

        const cardName = card.name;
        const normalizedCardName = normalizeName(cardName);

        // Try to find matching API card
        let apiCard: PokemonTCGCard | undefined;
        if (apiCardMap.has(normalizedCardName)) {
          apiCard = apiCardMap.get(normalizedCardName);
        } else {
          // Try fuzzy matching
          for (const [normalizedApi, apiCardData] of apiCardMap.entries()) {
            const cardNameClean = normalizedCardName.replace(/[^a-z0-9]/g, '');
            const apiNameClean = normalizedApi.replace(/[^a-z0-9]/g, '');

            if (cardNameClean === apiNameClean && cardNameClean.length > 0) {
              apiCard = apiCardData;
              break;
            }
          }
        }

        if (apiCard) {
          // Extract level from API card
          // Level might be in different fields: level, level property, or in name
          let level: number | undefined;

          // Check if level is in the API card object
          if (apiCard.level) {
            const levelStr = String(apiCard.level);
            const levelMatch = levelStr.match(/(\d+)/);
            if (levelMatch) {
              level = parseInt(levelMatch[1], 10);
            }
          }

          // Check if level is in the card name
          if (!level) {
            const nameMatch = apiCard.name.match(/lv\.?\s*(\d+)/i);
            if (nameMatch) {
              level = parseInt(nameMatch[1], 10);
            }
          }

          // Check other possible fields
          if (!level && (apiCard as any).levelNumber) {
            level = parseInt(String((apiCard as any).levelNumber), 10);
          }

          if (level && !isNaN(level)) {
            if (card.level !== level) {
              card.level = level;
              updatedCount++;
              console.log(
                `    ✓ Updated ${card.name} (${card.cardNumber}): level ${level}`,
              );
            }
          } else {
            notFound.push(`${card.cardNumber}: ${card.name} (no level in API)`);
          }
        } else {
          notFound.push(`${card.cardNumber}: ${card.name} (not found in API)`);
        }
      }

      // Save the updated JSON
      await fs.writeFile(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');

      console.log(`\n  ✅ Updated ${updatedCount} cards with level data`);
      if (notFound.length > 0) {
        console.log(`  ⚠️  ${notFound.length} Pokemon cards could not be matched:`);
        notFound.slice(0, 10).forEach((card) => console.log(`     - ${card}`));
        if (notFound.length > 10) {
          console.log(`     ... and ${notFound.length - 10} more`);
        }
      }
    } catch (error: any) {
      console.error(`  ❌ Error processing ${set.name}:`, error.message);
      if (error.response) {
        console.error(`     Status: ${error.response.status}`);
        console.error(`     Response: ${JSON.stringify(error.response.data).substring(0, 200)}`);
      }
      // Continue with next set
    }
  }

  console.log('\n✅ API fetch completed!');
}

// Run the fetcher
fetchLevelsFromAPI()
  .then(() => {
    console.log('\n✅ Process completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Process failed:', error);
    process.exit(1);
  });
