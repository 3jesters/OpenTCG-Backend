import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CardModule } from './modules/card/card.module';
import { SetModule } from './modules/set/set.module';
import { TournamentModule } from './modules/tournament/tournament.module';
import { DeckModule } from './modules/deck/deck.module';
import { MatchModule } from './modules/match/match.module';
import { DatabaseModule } from './shared/infrastructure/database/database.module';

@Module({
  imports: [
    // Global ConfigModule for environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', `.env.${process.env.NODE_ENV || 'dev'}`],
    }),
    CardModule,
    SetModule,
    TournamentModule,
    DeckModule,
    MatchModule,
    // DatabaseModule is safe to import - it won't initialize TypeORM in dev/test
    DatabaseModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
