import { readdir, unlink } from 'fs/promises';
import { join } from 'path';

/**
 * Jest Global Setup
 * Runs before all tests to clean up spec matches
 */
export default async function globalSetup() {
  const matchesDirectory = join(process.cwd(), 'data', 'matches');

  try {
    // Read all files in the matches directory
    const files = await readdir(matchesDirectory);
    
    // Filter files that match spec-match-*.json pattern
    const specMatchFiles = files.filter((file) => 
      file.startsWith('spec-match-') && file.endsWith('.json')
    );

    // Delete each spec match file
    for (const file of specMatchFiles) {
      const filePath = join(matchesDirectory, file);
      try {
        await unlink(filePath);
        console.log(`Deleted spec match: ${file}`);
      } catch (error: any) {
        // Ignore errors if file doesn't exist
        if (error.code !== 'ENOENT') {
          console.error(`Error deleting spec match ${file}:`, error.message);
        }
      }
    }

    if (specMatchFiles.length > 0) {
      console.log(`Cleaned up ${specMatchFiles.length} spec match(es) before test run`);
    }
  } catch (error: any) {
    // If directory doesn't exist, that's fine - no matches to clean up
    if (error.code !== 'ENOENT') {
      console.error('Error in global setup:', error.message);
    }
  }
}

