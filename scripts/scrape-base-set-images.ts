import puppeteer from 'puppeteer';
import * as fs from 'fs/promises';
import * as path from 'path';

interface CardData {
  name: string;
  cardNumber: string;
  imageUrl: string;
}

/**
 * Scrape Base Set Images from Pikawiz
 * This script scrapes the pikawiz.com website to get the correct image URLs
 * for all cards in the Pokemon Base Set and updates the JSON file.
 */
async function scrapeBaseSetImages() {
  const baseUrl = 'https://www.pikawiz.com';
  const setUrl = `${baseUrl}/baseset`;
  
  console.log('Starting to scrape base set images from:', setUrl);
  console.log('Launching browser...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set a realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log('Navigating to page...');
    await page.goto(setUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Wait a bit for Cloudflare challenge to complete
    console.log('Waiting for page to load...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Save page HTML for debugging
    const html = await page.content();
    await fs.writeFile(path.join(__dirname, '../debug-page.html'), html, 'utf-8');
    console.log('Saved page HTML to debug-page.html for inspection');
    
    // Extract image URLs from the page HTML
    // Match by card name since card numbers don't align between HTML and JSON
    console.log('Extracting image URLs from page HTML...');
    const cardNameToUrlMap = new Map<string, string>();
    
    // Get all card list items and extract image URLs by card name
    const cardImageUrls = await page.evaluate(() => {
      const map = new Map<string, string>();
      const cardItems = document.querySelectorAll('.card-list-item-cards');
      
      console.log(`Found ${cardItems.length} card items in page`);
      
      cardItems.forEach((item) => {
        const cardName = item.getAttribute('data-card-name');
        const cardNumber = item.getAttribute('data-card-nunber'); // Note: typo in HTML
        const img = item.querySelector('img');
        
        if (cardName && img) {
          const src = img.getAttribute('src') || img.getAttribute('data-src');
          if (src) {
            // Convert relative URL to absolute
            const fullUrl = src.startsWith('http') 
              ? src 
              : `https://www.pikawiz.com${src.startsWith('/') ? '' : '/'}${src}`;
            // Store both normalized and original name
            const normalizedName = cardName.toLowerCase().trim();
            map.set(normalizedName, fullUrl);
          }
        }
      });
      
      return Array.from(map.entries()).map(([name, url]) => ({ name, url }));
    });
    
    console.log(`\nExtracted ${cardImageUrls.length} card image URLs from page`);
    
    cardImageUrls.forEach(({ name, url }) => {
      cardNameToUrlMap.set(name, url);
      console.log(`  "${name}": ${url}`);
    });
    
    if (cardImageUrls.length === 0) {
      console.warn('⚠️  No cards found! The page may not have loaded correctly.');
      console.warn('   Check debug-page.html to see what was actually loaded.');
    }
    
    // Read the current JSON file
    // __dirname points to the compiled JS location, so we need to go up from scripts/
    const jsonPath = path.resolve(__dirname, '..', 'data', 'cards', 'pokemon-base-set-v1.0.json');
    console.log(`Reading JSON from: ${jsonPath}`);
    const jsonContent = await fs.readFile(jsonPath, 'utf-8');
    
    if (!jsonContent || jsonContent.trim().length === 0) {
      throw new Error('JSON file is empty');
    }
    
    const jsonData = JSON.parse(jsonContent);
    
    // Helper function to normalize card names for matching
    const normalizeName = (name: string): string => {
      return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, '') // Remove special chars but keep letters, numbers, spaces
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
    };
    
    // Create a normalized map for better matching
    const normalizedMap = new Map<string, { originalName: string; url: string }>();
    cardNameToUrlMap.forEach((url, name) => {
      const normalized = normalizeName(name);
      if (!normalizedMap.has(normalized)) {
        normalizedMap.set(normalized, { originalName: name, url });
      }
    });
    
    // Update image URLs by matching card names
    let updatedCount = 0;
    const notFound: string[] = [];
    
    for (const card of jsonData.cards) {
      const cardName = card.name;
      const normalizedCardName = normalizeName(cardName);
      
      let matched = false;
      let matchedUrl: string | null = null;
      
      // Try exact normalized match first
      if (normalizedMap.has(normalizedCardName)) {
        matchedUrl = normalizedMap.get(normalizedCardName)!.url;
        matched = true;
      } else {
        // Try fuzzy matching - check if normalized names are similar
        for (const [normalizedScraped, data] of normalizedMap.entries()) {
          // Remove all non-alphanumeric and compare
          const cardNameClean = normalizedCardName.replace(/[^a-z0-9]/g, '');
          const scrapedNameClean = normalizedScraped.replace(/[^a-z0-9]/g, '');
          
          if (cardNameClean === scrapedNameClean) {
            matchedUrl = data.url;
            matched = true;
            console.log(`  Matched "${cardName}" with "${data.originalName}" (normalized)`);
            break;
          }
          
          // Try partial matching for multi-word names
          const cardWords = normalizedCardName.split(/\s+/);
          const scrapedWords = normalizedScraped.split(/\s+/);
          
          if (cardWords.length > 1 && scrapedWords.length > 1) {
            // Check if all significant words match
            const cardSignificant = cardWords.filter(w => w.length > 2);
            const scrapedSignificant = scrapedWords.filter(w => w.length > 2);
            
            if (cardSignificant.length === scrapedSignificant.length &&
                cardSignificant.every((w, i) => scrapedSignificant[i] === w)) {
              matchedUrl = data.url;
              matched = true;
              console.log(`  Matched "${cardName}" with "${data.originalName}" (word match)`);
              break;
            }
          }
        }
      }
      
      if (matched && matchedUrl) {
        if (card.imageUrl !== matchedUrl) {
          console.log(`Updating card #${card.cardNumber} (${card.name}): ${card.imageUrl} -> ${matchedUrl}`);
          card.imageUrl = matchedUrl;
          updatedCount++;
        }
      } else {
        notFound.push(`${card.cardNumber}: ${card.name}`);
        console.warn(`Warning: Could not find image URL for card #${card.cardNumber} (${card.name})`);
      }
    }
    
    // Save the updated JSON
    await fs.writeFile(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');
    
    console.log(`\n✅ Updated ${updatedCount} card image URLs`);
    if (notFound.length > 0) {
      console.log(`⚠️  ${notFound.length} cards could not be matched:`);
      notFound.forEach(card => console.log(`   - ${card}`));
    } else {
      console.log(`✅ All ${jsonData.cards.length} cards successfully updated!`);
    }
    
    return cardNameToUrlMap;
    
  } catch (error) {
    console.error('Error scraping website:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the scraper
scrapeBaseSetImages()
  .then(() => {
    console.log('\n✅ Scraping completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Scraping failed:', error);
    process.exit(1);
  });

