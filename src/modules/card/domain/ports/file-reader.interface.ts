/**
 * File Reader Port Interface
 * Abstracts file system operations for reading card data files
 */
export interface IFileReader {
  /**
   * Read and parse a JSON file from the card data directory
   * @param filename - Name of the file (e.g., "pokemon-base-set-v1.0.json")
   * @returns Parsed JSON object
   * @throws Error if file not found or invalid JSON
   */
  readCardFile(filename: string): Promise<unknown>;

  /**
   * Check if a file exists in the card data directory
   * @param filename - Name of the file to check
   * @returns True if file exists, false otherwise
   */
  fileExists(filename: string): Promise<boolean>;

  /**
   * List all card JSON files in the data directory
   * @returns Array of filenames
   */
  listCardFiles(): Promise<string[]>;
}

// Symbol for dependency injection
export const IFileReader = Symbol('IFileReader');
