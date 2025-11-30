import { Module } from '@nestjs/common';
import { IFileReader } from './domain/ports/file-reader.interface';
import { FileReaderService } from './infrastructure/file-system/file-reader.service';
import { GetAvailableSetsUseCase } from './application/use-cases/get-available-sets.use-case';
import { PreviewSetUseCase } from './application/use-cases/preview-set.use-case';
import { PreviewCardUseCase } from './application/use-cases/preview-card.use-case';
import { GetCardByIdUseCase } from './application/use-cases/get-card-by-id.use-case';
import { CardController } from './presentation/controllers/card.controller';

@Module({
  controllers: [CardController],
  providers: [
    // Port implementations
    {
      provide: IFileReader,
      useClass: FileReaderService,
    },
    // Use cases
    GetAvailableSetsUseCase,
    PreviewSetUseCase,
    PreviewCardUseCase,
    GetCardByIdUseCase,
  ],
  exports: [
    // Export file reader if other modules need access to card files
    IFileReader,
    // Export use cases for other modules
    GetCardByIdUseCase,
  ],
})
export class CardModule {}

