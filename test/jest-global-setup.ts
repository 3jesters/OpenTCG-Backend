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
    
    // Filter files that match test match patterns (spec-match-*.json or mock-test-*.json)
    const testMatchFiles = files.filter((file) => 
      (file.startsWith('spec-match-') || file.startsWith('mock-test-')) && file.endsWith('.json')
    );

    // Delete each test match file BEFORE running tests
    for (const file of testMatchFiles) {
      const filePath = join(matchesDirectory, file);
      try {
        await unlink(filePath);
        console.log(`Deleted test match: ${file}`);
      } catch (error: any) {
        // Ignore errors if file doesn't exist
        if (error.code !== 'ENOENT') {
          console.error(`Error deleting test match ${file}:`, error.message);
        }
      }
    }

    if (testMatchFiles.length > 0) {
      console.log(`Cleaned up ${testMatchFiles.length} test match(es) before test run`);
    }
  } catch (error: any) {
    // If directory doesn't exist, that's fine - no matches to clean up
    if (error.code !== 'ENOENT') {
      console.error('Error in global setup:', error.message);
    }
  }
}

