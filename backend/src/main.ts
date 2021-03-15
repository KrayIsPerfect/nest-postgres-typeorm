import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
// @ts-ignore
import * as compression from 'compression';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(compression());
  app.use(cookieParser());

  // создать страницу с описанием API
  SwaggerModule.setup(
    '/docs/',
    app,
    SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('API nest-postgres-typeorm')
        .setVersion('1.0')
        .build(),
    ),
    {
      swaggerOptions: {
        docExpansion: 'none',
        displayRequestDuration: true,
      },
    },
  );

  await app.listen(3000);
}
bootstrap();
