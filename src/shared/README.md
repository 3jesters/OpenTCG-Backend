# Shared Module

This module provides shared services and utilities that can be used across all modules in the application.

## Services

### Logger Service

The logger service provides a consistent logging interface that can be implemented in different ways (console, file, cloud logging, etc.).

#### Usage

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { ILogger } from '../../shared/application/ports/logger.interface';

@Injectable()
export class MyService {
  constructor(
    @Inject(ILogger)
    private readonly logger: ILogger,
  ) {}

  someMethod() {
    this.logger.info('Processing request', 'MyService');
    this.logger.debug('Debug information', 'MyService', { data: 'value' });
    this.logger.error('An error occurred', 'MyService', new Error('Error message'));
  }
}
```

#### Available Log Levels

- `debug(message, context?, data?)` - Debug level logging
- `info(message, context?, data?)` - Informational messages
- `warn(message, context?, data?)` - Warning messages
- `error(message, context?, error?)` - Error messages
- `verbose(message, context?, data?)` - Verbose logging

#### Current Implementation

Currently, the logger is implemented as `ConsoleLoggerService` which logs to the console. The implementation can be easily swapped by changing the provider in `shared.module.ts`.

#### Future Implementations

The logger interface allows for easy extension with other implementations:
- File logger (write to log files)
- Cloud logger (send to cloud logging services)
- Structured logger (JSON format)
- etc.


