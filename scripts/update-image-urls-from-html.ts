import * as fs from 'fs/promises';
import * as path from 'path';
import * as cheerio from 'cheerio';

/**
 * Update Base Set Image URLs from HTML
 * This script parses the provided HTML to extract card name to image URL mappings
 * and updates the JSON file accordingly.
 */
async function updateImageUrlsFromHtml() {
  // Read the HTML file (you can paste the HTML here or read from a file)
  const htmlPath = path.resolve(__dirname, '..', 'debug-page.html');
  let html: string;
  
  try {
    html = await fs.readFile(htmlPath, 'utf-8');
  } catch (error) {
    console.error('Could not read HTML file. Please ensure debug-page.html exists or paste HTML directly.');
    throw error;
  }
  
  const $ = cheerio.load(html);
  const cardNameToUrlMap = new Map<string, string>();
  
  // Extract card name to image URL mappings
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
      cardNameToUrlMap.set(normalizedName, fullUrl);
      console.log(`Found: "${cardName}" -> ${fullUrl}`);
    }
  });
  
  console.log(`\nExtracted ${cardNameToUrlMap.size} card image URLs from HTML\n`);
  
  // Read the JSON file
  const jsonPath = path.resolve(__dirname, '..', 'data', 'cards', 'pokemon-base-set-v1.0.json');
  const jsonContent = await fs.readFile(jsonPath, 'utf-8');
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
  
  // Update image URLs by matching card names
  let updatedCount = 0;
  const notFound: string[] = [];
  
  for (const card of jsonData.cards) {
    const cardName = card.name;
    const normalizedCardName = normalizeName(cardName);
    
    let matched = false;
    let matchedUrl: string | null = null;
    
    // Try exact normalized match first
    if (cardNameToUrlMap.has(normalizedCardName)) {
      matchedUrl = cardNameToUrlMap.get(normalizedCardName)!;
      matched = true;
    } else {
      // Try fuzzy matching - check if normalized names are similar
      for (const [normalizedScraped, url] of cardNameToUrlMap.entries()) {
        // Remove all non-alphanumeric and compare
        const cardNameClean = normalizedCardName.replace(/[^a-z0-9]/g, '');
        const scrapedNameClean = normalizedScraped.replace(/[^a-z0-9]/g, '');
        
        if (cardNameClean === scrapedNameClean && cardNameClean.length > 0) {
          matchedUrl = url;
          matched = true;
          console.log(`  Matched "${cardName}" with scraped name (normalized)`);
          break;
        }
        
        // Try partial matching for multi-word names
        const cardWords = normalizedCardName.split(/\s+/).filter(w => w.length > 2);
        const scrapedWords = normalizedScraped.split(/\s+/).filter(w => w.length > 2);
        
        if (cardWords.length > 0 && scrapedWords.length > 0) {
          // Check if significant words match
          const allMatch = cardWords.every(cw => 
            scrapedWords.some(sw => cw === sw || cw.includes(sw) || sw.includes(cw))
          );
          
          if (allMatch && cardWords.length === scrapedWords.length) {
            matchedUrl = url;
            matched = true;
            console.log(`  Matched "${cardName}" with scraped name (word match)`);
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
}

// Run the updater
updateImageUrlsFromHtml()
  .then(() => {
    console.log('\n✅ Update completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Update failed:', error);
    process.exit(1);
  });

