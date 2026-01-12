/**
 * Logger Service Interface
 * Defines contract for logging functionality
 * Allows for different logging implementations (console, file, cloud, etc.)
 */
export interface ILogger {
  /**
   * Log a debug message
   * @param message - The message to log
   * @param context - Optional context (e.g., class name, module name)
   * @param data - Optional additional data to log
   */
  debug(message: string, context?: string, data?: unknown): void;

  /**
   * Log an info message
   * @param message - The message to log
   * @param context - Optional context (e.g., class name, module name)
   * @param data - Optional additional data to log
   */
  info(message: string, context?: string, data?: unknown): void;

  /**
   * Log a warning message
   * @param message - The message to log
   * @param context - Optional context (e.g., class name, module name)
   * @param data - Optional additional data to log
   */
  warn(message: string, context?: string, data?: unknown): void;

  /**
   * Log an error message
   * @param message - The message to log
   * @param context - Optional context (e.g., class name, module name)
   * @param error - Optional error object or additional data
   */
  error(message: string, context?: string, error?: unknown): void;

  /**
   * Log a verbose message
   * @param message - The message to log
   * @param context - Optional context (e.g., class name, module name)
   * @param data - Optional additional data to log
   */
  verbose(message: string, context?: string, data?: unknown): void;
}

/**
 * Logger Service Token
 * Used for dependency injection
 */
export const ILogger = Symbol('ILogger');
