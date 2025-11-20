import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CardModule } from './modules/card/card.module';
import { SetModule } from './modules/set/set.module';
import { TournamentModule } from './modules/tournament/tournament.module';
import { DeckModule } from './modules/deck/deck.module';

@Module({
  imports: [CardModule, SetModule, TournamentModule, DeckModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
