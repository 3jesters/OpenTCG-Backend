import { Module } from '@nestjs/common';
import { IFileReader } from './domain/ports/file-reader.interface';
import { FileReaderService } from './infrastructure/file-system/file-reader.service';
import { GetAvailableSetsUseCase } from './application/use-cases/get-available-sets.use-case';
import { PreviewSetUseCase } from './application/use-cases/preview-set.use-case';
import { PreviewCardUseCase } from './application/use-cases/preview-card.use-case';
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
  ],
  exports: [
    // Export file reader if other modules need access to card files
    IFileReader,
  ],
})
export class CardModule {}

