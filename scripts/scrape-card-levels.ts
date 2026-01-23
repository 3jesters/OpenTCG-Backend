import puppeteer from 'puppeteer';
import * as fs from 'fs/promises';
import * as path from 'path';

interface CardLevelData {
  name: string;
  level?: number;
}

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

/**
 * Scrape card levels from Pikawiz
 * This script scrapes pikawiz.com to get level data for Pokemon cards
 * and updates the JSON files.
 */
async function scrapeCardLevels() {
  const baseUrl = 'https://www.pikawiz.com';
  const sets = [
    { name: 'base-set', url: `${baseUrl}/baseset`, file: 'pokemon-base-set-v1.0.json' },
    { name: 'jungle', url: `${baseUrl}/jungle`, file: 'pokemon-jungle-v1.0.json' },
    { name: 'fossil', url: `${baseUrl}/fossil`, file: 'pokemon-fossil-v1.0.json' },
  ];

  console.log('🚀 Starting to scrape card levels from pikawiz.com...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    for (const set of sets) {
      console.log(`\n📦 Processing ${set.name} set...`);
      await scrapeSetLevels(browser, set.url, set.file, set.name);
    }

    console.log('\n✅ All sets processed successfully!');
  } catch (error) {
    console.error('❌ Error scraping card levels:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function scrapeSetLevels(
  browser: any,
  setUrl: string,
  filename: string,
  setName: string,
) {
  const page = await browser.newPage();

  try {
    // Set a realistic user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    );

    console.log(`  Navigating to ${setUrl}...`);
    
    try {
      await page.goto(setUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    } catch (error) {
      console.warn(`  ⚠️  Navigation timeout, trying with longer wait...`);
      await page.goto(setUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
    }

    // Wait for Cloudflare challenge to complete
    console.log('  Waiting for page to load (Cloudflare challenge)...');
    await new Promise((resolve) => setTimeout(resolve, 8000));
    
    // Check if page loaded correctly
    const pageTitle = await page.title();
    const pageUrl = page.url();
    console.log(`  Page loaded: ${pageTitle || 'No title'} at ${pageUrl}`);
    
    if (pageUrl.includes('challenge') || pageTitle.includes('Just a moment')) {
      console.warn('  ⚠️  Cloudflare challenge detected, waiting longer...');
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }

    // Extract level data from card list items
    console.log('  Extracting level data from page...');
    
    // Try multiple selectors in case page structure varies
    const cardData = await page.evaluate(() => {
      const cards: Array<{ name: string; level?: number; link?: string }> = [];
      
      // Try multiple selectors
      let cardItems = document.querySelectorAll('.card-list-item-cards');
      if (cardItems.length === 0) {
        cardItems = document.querySelectorAll('[data-card-name]');
      }
      if (cardItems.length === 0) {
        cardItems = document.querySelectorAll('.card-item, .card, [class*="card"]');
      }
      
      console.log(`Found ${cardItems.length} card items on page`);

      cardItems.forEach((item) => {
        const cardName = item.getAttribute('data-card-name');
        if (!cardName) return;

        // Look for level in various places:
        // 1. In the card name itself (e.g., "Pikachu lv. 12")
        // 2. In a level attribute or data attribute
        // 3. In the card text/content
        // 4. In card detail link (may need to visit individual pages)

        let level: number | undefined;

        // Check if level is in the card name
        const nameMatch = cardName.match(/lv\.?\s*(\d+)/i);
        if (nameMatch) {
          level = parseInt(nameMatch[1], 10);
        } else {
          // Check for level in data attributes
          const levelAttr =
            item.getAttribute('data-level') ||
            item.getAttribute('data-card-level');
          if (levelAttr) {
            level = parseInt(levelAttr, 10);
          } else {
            // Check card text content for level
            const cardText = item.textContent || '';
            const textMatch = cardText.match(/lv\.?\s*(\d+)/i);
            if (textMatch) {
              level = parseInt(textMatch[1], 10);
            } else {
              // Try to find level in card image alt text or title
              const img = item.querySelector('img');
              if (img) {
                const altText = img.getAttribute('alt') || img.getAttribute('title') || '';
                const altMatch = altText.match(/lv\.?\s*(\d+)/i);
                if (altMatch) {
                  level = parseInt(altMatch[1], 10);
                }
              }
            }
          }
        }

        // Get card detail link if available
        const link = item.querySelector('a')?.getAttribute('href') || undefined;

        // Normalize card name (remove level from name for matching)
        const normalizedName = cardName
          .replace(/\s*lv\.?\s*\d+/i, '')
          .trim()
          .toLowerCase();

        cards.push({ name: normalizedName, level, link });
      });

      return cards;
    });
    
    console.log(`  Found ${cardData.length} cards on page`);

    // If levels not found on list page, try visiting individual card pages
    const cardsWithoutLevel = cardData.filter((c) => !c.level);
    if (cardsWithoutLevel.length > 0 && cardsWithoutLevel[0].link) {
      console.log(
        `  ${cardsWithoutLevel.length} cards missing level data, trying individual pages...`,
      );

      for (const card of cardsWithoutLevel.slice(0, 10)) {
        // Limit to first 10 to avoid too many requests
        if (!card.link) continue;

        try {
          const cardUrl = card.link.startsWith('http')
            ? card.link
            : `https://www.pikawiz.com${card.link}`;
          console.log(`    Visiting ${cardUrl}...`);

          await page.goto(cardUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000,
          });
          await new Promise((resolve) => setTimeout(resolve, 2000));

          const level = await page.evaluate(() => {
            // Look for level in page content
            const pageText = document.body.textContent || '';
            const match = pageText.match(/lv\.?\s*(\d+)/i);
            if (match) {
              return parseInt(match[1], 10);
            }
            return undefined;
          });

          if (level) {
            const cardIndex = cardData.findIndex((c) => c.name === card.name);
            if (cardIndex >= 0) {
              cardData[cardIndex].level = level;
              console.log(`      ✓ Found level ${level} for ${card.name}`);
            }
          }
        } catch (error) {
          console.warn(`      ⚠️  Error visiting ${card.link}: ${error}`);
        }
      }
    }

    // Filter to only cards with levels
    const cardLevels = cardData
      .filter((c) => c.level !== undefined)
      .map((c) => ({ name: c.name, level: c.level! }));

    console.log(`  Found ${cardLevels.length} cards with level data`);
    if (cardLevels.length === 0) {
      console.warn('  ⚠️  No level data found on list page.');
      console.warn('  This could be due to:');
      console.warn('    1. Cloudflare blocking automated access');
      console.warn('    2. Page structure changed');
      console.warn('    3. Levels not displayed on list page (may need individual card pages)');
      console.warn('  Saving page HTML for inspection...');
      const html = await page.content();
      await fs.writeFile(
        path.join(__dirname, `../debug-${setName}-page.html`),
        html,
        'utf-8',
      );
      console.warn('  💡 Tip: Use scripts/add-card-levels-manual.ts to add levels manually');
      return;
    }

    // Read the JSON file
    const jsonPath = path.resolve(__dirname, '..', 'data', 'cards', filename);
    const jsonContent = await fs.readFile(jsonPath, 'utf-8');
    const jsonData: CardSetFile = JSON.parse(jsonContent);

    // Helper function to normalize card names for matching
    const normalizeName = (name: string): string => {
      return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, '') // Remove special chars
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
    };

    // Create a map of normalized names to levels
    const levelMap = new Map<string, number>();
    cardLevels.forEach(({ name, level }) => {
      if (level !== undefined) {
        const normalized = normalizeName(name);
        levelMap.set(normalized, level);
      }
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

      // Try to find level
      let level: number | undefined;

      // Try exact match
      if (levelMap.has(normalizedCardName)) {
        level = levelMap.get(normalizedCardName);
      } else {
        // Try fuzzy matching
        for (const [normalizedScraped, scrapedLevel] of levelMap.entries()) {
          const cardNameClean = normalizedCardName.replace(/[^a-z0-9]/g, '');
          const scrapedNameClean = normalizedScraped.replace(/[^a-z0-9]/g, '');

          if (cardNameClean === scrapedNameClean && cardNameClean.length > 0) {
            level = scrapedLevel;
            break;
          }

          // Try word matching for multi-word names
          const cardWords = normalizedCardName.split(/\s+/).filter((w) => w.length > 2);
          const scrapedWords = normalizedScraped.split(/\s+/).filter((w) => w.length > 2);

          if (
            cardWords.length > 0 &&
            scrapedWords.length > 0 &&
            cardWords.length === scrapedWords.length &&
            cardWords.every((w, i) => scrapedWords[i] === w)
          ) {
            level = scrapedLevel;
            break;
          }
        }
      }

      if (level !== undefined) {
        if (card.level !== level) {
          card.level = level;
          updatedCount++;
          console.log(
            `    ✓ Updated ${card.name} (${card.cardNumber}): level ${level}`,
          );
        }
      } else {
        // Only log if it's a Pokemon card (not Trainer/Energy)
        if (!card.cardType || card.cardType === 'POKEMON') {
          notFound.push(`${card.cardNumber}: ${card.name}`);
        }
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
  } catch (error) {
    console.error(`  ❌ Error processing ${setName}:`, error);
    throw error;
  } finally {
    await page.close();
  }
}

// Run the scraper
scrapeCardLevels()
  .then(() => {
    console.log('\n✅ Scraping completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Scraping failed:', error);
    process.exit(1);
  });
