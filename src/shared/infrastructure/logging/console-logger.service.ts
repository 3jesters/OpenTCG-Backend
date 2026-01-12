import { Injectable } from '@nestjs/common';
import { ILogger } from '../../application/ports/logger.interface';

/**
 * Console Logger Service
 * Implementation of ILogger that logs to console
 */
@Injectable()
export class ConsoleLoggerService implements ILogger {
  /**
   * Format log message with context and timestamp
   */
  private formatMessage(
    level: string,
    message: string,
    context?: string,
  ): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? `[${context}]` : '';
    return `${timestamp} ${level} ${contextStr} ${message}`;
  }

  /**
   * Format data for logging
   */
  private formatData(data: unknown): string {
    if (data === undefined || data === null) {
      return '';
    }
    try {
      return `\n${JSON.stringify(data, null, 2)}`;
    } catch {
      return `\n${String(data)}`;
    }
  }

  debug(message: string, context?: string, data?: unknown): void {
    const formattedMessage = this.formatMessage('DEBUG', message, context);
    if (data !== undefined) {
      console.debug(formattedMessage, this.formatData(data));
    } else {
      console.debug(formattedMessage);
    }
  }

  info(message: string, context?: string, data?: unknown): void {
    const formattedMessage = this.formatMessage('INFO', message, context);
    if (data !== undefined) {
      console.info(formattedMessage, this.formatData(data));
    } else {
      console.info(formattedMessage);
    }
  }

  warn(message: string, context?: string, data?: unknown): void {
    const formattedMessage = this.formatMessage('WARN', message, context);
    if (data !== undefined) {
      console.warn(formattedMessage, this.formatData(data));
    } else {
      console.warn(formattedMessage);
    }
  }

  error(message: string, context?: string, error?: unknown): void {
    const formattedMessage = this.formatMessage('ERROR', message, context);
    if (error !== undefined) {
      if (error instanceof Error) {
        console.error(formattedMessage, error.message, error.stack);
      } else {
        console.error(formattedMessage, this.formatData(error));
      }
    } else {
      console.error(formattedMessage);
    }
  }

  verbose(message: string, context?: string, data?: unknown): void {
    const formattedMessage = this.formatMessage('VERBOSE', message, context);
    if (data !== undefined) {
      console.log(formattedMessage, this.formatData(data));
    } else {
      console.log(formattedMessage);
    }
  }
}
