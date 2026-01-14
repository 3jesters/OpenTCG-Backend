import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS - allow all origins
  app.enableCors();

  // Enable validation pipes globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger/OpenAPI Documentation
  const config = new DocumentBuilder()
    .setTitle('OpenTCG Backend API')
    .setDescription(
      'Trading Card Game backend API with comprehensive game mechanics and AI player support. ' +
        'Educational fan project based on Pokémon TCG.\n\n' +
        '⚠️ DISCLAIMER: This project contains Pokémon-related content which is the intellectual property of ' +
        'Nintendo, The Pokémon Company, and Game Freak. Not affiliated with or endorsed by these companies. ' +
        'For educational purposes only.',
    )
    .setVersion('0.0.1')
    .setContact(
      'OpenTCG Contributors',
      'https://github.com/YOUR_USERNAME/OpenTCG-Backend',
      '',
    )
    .setLicense(
      'MIT License',
      'https://github.com/YOUR_USERNAME/OpenTCG-Backend/blob/main/LICENSE',
    )
    .addTag('cards', 'Card management and queries')
    .addTag('sets', 'Card set management')
    .addTag('decks', 'Deck builder and validation')
    .addTag('matches', 'Game match management')
    .addTag('tournaments', 'Tournament system')
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'OpenTCG API Documentation',
    customfavIcon: 'https://nestjs.com/img/logo_text.svg',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}

void bootstrap();
