import * as fs from 'fs/promises';
import * as path from 'path';
import * as cheerio from 'cheerio';

/**
 * Update Base Set Image URLs from Provided HTML
 * This script uses the HTML provided by the user to extract card name to image URL mappings
 */
async function updateImageUrlsFromProvidedHtml() {
  // The HTML content provided by the user (you can paste it here or read from a file)
  // For now, we'll read from a file that you can create with the HTML
  const htmlPath = path.resolve(__dirname, '..', 'provided-html.html');
  
  let html: string;
  try {
    html = await fs.readFile(htmlPath, 'utf-8');
  } catch (error) {
    console.error('Please create provided-html.html with the HTML content from the website');
    throw error;
  }
  
  const $ = cheerio.load(html);
  const cardNameToUrlMap = new Map<string, string>();
  
  console.log('Extracting card image URLs from HTML...\n');
  
  // Extract card name to image URL mappings from .card-list-item-cards elements
  $('.card-list-item-cards').each((index, element) => {
    const $el = $(element);
    const cardName = $el.attr('data-card-name');
    const img = $el.find('img');
    const src = img.attr('src') || img.attr('data-src');
    
    if (cardName && src) {
      const fullUrl = src.startsWith('http') 
        ? src 
        : `https://www.pikawiz.com${src.startsWith('/') ? '' : '/'}${src}`;
      
      const normalizedName = cardName.toLowerCase().trim();
      if (!cardNameToUrlMap.has(normalizedName)) {
        cardNameToUrlMap.set(normalizedName, fullUrl);
        console.log(`  "${cardName}" -> ${fullUrl}`);
      }
    }
  });
  
  console.log(`\n✅ Extracted ${cardNameToUrlMap.size} card image URLs from HTML\n`);
  
  if (cardNameToUrlMap.size === 0) {
    console.error('❌ No cards found in HTML! Please check the HTML content.');
    process.exit(1);
  }
  
  // Read the JSON file
  const jsonPath = path.resolve(__dirname, '..', 'data', 'cards', 'pokemon-base-set-v1.0.json');
  const jsonContent = await fs.readFile(jsonPath, 'utf-8');
  const jsonData = JSON.parse(jsonContent);
  
  // Helper function to normalize card names for matching
  const normalizeName = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .normalize('NFD') // Decompose characters (é -> e + ́)
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^\w\s]/g, '') // Remove special chars but keep letters, numbers, spaces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  };
  
  // Update image URLs by matching card names
  let updatedCount = 0;
  const notFound: string[] = [];
  
  console.log('Matching and updating cards...\n');
  
  for (const card of jsonData.cards) {
    const cardName = card.name;
    const normalizedCardName = normalizeName(cardName);
    
    let matched = false;
    let matchedUrl: string | null = null;
    let matchedScrapedName: string | null = null;
    
    // Try exact normalized match first
    if (cardNameToUrlMap.has(normalizedCardName)) {
      matchedUrl = cardNameToUrlMap.get(normalizedCardName)!;
      matchedScrapedName = normalizedCardName;
      matched = true;
    } else {
      // Try fuzzy matching
      for (const [normalizedScraped, url] of cardNameToUrlMap.entries()) {
        // Remove all non-alphanumeric and compare
        const cardNameClean = normalizedCardName.replace(/[^a-z0-9]/g, '');
        const scrapedNameClean = normalizedScraped.replace(/[^a-z0-9]/g, '');
        
        if (cardNameClean === scrapedNameClean && cardNameClean.length > 0) {
          matchedUrl = url;
          matchedScrapedName = normalizedScraped;
          matched = true;
          break;
        }
        
        // Try word-by-word matching
        const cardWords = normalizedCardName.split(/\s+/).filter(w => w.length > 1);
        const scrapedWords = normalizedScraped.split(/\s+/).filter(w => w.length > 1);
        
        if (cardWords.length > 0 && scrapedWords.length > 0) {
          // Check if all significant words from card name exist in scraped name
          const allWordsMatch = cardWords.every(cw => 
            scrapedWords.some(sw => {
              const cwClean = cw.replace(/[^a-z0-9]/g, '');
              const swClean = sw.replace(/[^a-z0-9]/g, '');
              return cwClean === swClean || cwClean.includes(swClean) || swClean.includes(cwClean);
            })
          );
          
          if (allWordsMatch && Math.abs(cardWords.length - scrapedWords.length) <= 1) {
            matchedUrl = url;
            matchedScrapedName = normalizedScraped;
            matched = true;
            break;
          }
        }
      }
    }
    
    if (matched && matchedUrl) {
      if (card.imageUrl !== matchedUrl) {
        console.log(`✓ Card #${card.cardNumber} (${card.name}) -> ${matchedUrl}`);
        card.imageUrl = matchedUrl;
        updatedCount++;
      }
    } else {
      notFound.push(`${card.cardNumber}: ${card.name}`);
    }
  }
  
  // Save the updated JSON
  await fs.writeFile(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');
  
  console.log(`\n✅ Updated ${updatedCount} card image URLs`);
  if (notFound.length > 0) {
    console.log(`⚠️  ${notFound.length} cards could not be matched:`);
    notFound.slice(0, 10).forEach(card => console.log(`   - ${card}`));
    if (notFound.length > 10) {
      console.log(`   ... and ${notFound.length - 10} more`);
    }
  } else {
    console.log(`✅ All ${jsonData.cards.length} cards successfully updated!`);
  }
}

// Run the updater
updateImageUrlsFromProvidedHtml()
  .then(() => {
    console.log('\n✅ Update completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Update failed:', error);
    process.exit(1);
  });

