import { Module } from '@nestjs/common';
import { IFileReader } from './domain/ports/file-reader.interface';
import { ICardCache } from './domain/repositories/card-cache.interface';
import { FileReaderService } from './infrastructure/file-system/file-reader.service';
import { InMemoryCardCacheService } from './infrastructure/cache/in-memory-card-cache.service';
import { LoadCardsFromFileUseCase } from './application/use-cases/load-cards-from-file.use-case';
import { GetLoadedSetsUseCase } from './application/use-cases/get-loaded-sets.use-case';
import { GetCardsFromSetUseCase } from './application/use-cases/get-cards-from-set.use-case';
import { GetCardByIdUseCase } from './application/use-cases/get-card-by-id.use-case';
import { SearchCardsUseCase } from './application/use-cases/search-cards.use-case';
import { CardController } from './presentation/controllers/card.controller';

@Module({
  controllers: [CardController],
  providers: [
    // Port implementations
    {
      provide: IFileReader,
      useClass: FileReaderService,
    },
    {
      provide: ICardCache,
      useClass: InMemoryCardCacheService,
    },
    // Use cases
    LoadCardsFromFileUseCase,
    GetLoadedSetsUseCase,
    GetCardsFromSetUseCase,
    GetCardByIdUseCase,
    SearchCardsUseCase,
  ],
  exports: [
    // Export cache so other modules can access loaded cards if needed
    ICardCache,
  ],
})
export class CardModule {}

