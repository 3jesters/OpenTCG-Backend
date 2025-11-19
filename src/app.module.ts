import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CardModule } from './modules/card/card.module';
import { SetModule } from './modules/set/set.module';

@Module({
  imports: [CardModule, SetModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
