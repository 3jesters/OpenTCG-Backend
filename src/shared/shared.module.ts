import { Module, Global } from '@nestjs/common';
import { ILogger } from './application/ports/logger.interface';
import { ConsoleLoggerService } from './infrastructure/logging/console-logger.service';

/**
 * Shared Module
 * Provides shared services that can be used across all modules
 * Marked as @Global() so it doesn't need to be imported in every module
 */
@Global()
@Module({
  providers: [
    {
      provide: ILogger,
      useClass: ConsoleLoggerService,
    },
  ],
  exports: [ILogger],
})
export class SharedModule {}


