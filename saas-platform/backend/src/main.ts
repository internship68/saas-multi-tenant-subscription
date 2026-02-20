import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import { ResponseInterceptor } from './shared/interceptors/response.interceptor';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule.forRoot(), {
    rawBody: true,
  });

  const role = process.env.APP_ROLE || 'ALL';
  const port = process.env.PORT ?? 3000;

  app.useLogger(app.get(Logger));


  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  if (role === 'API' || role === 'ALL') {
    await app.listen(port);
    console.log(`API is running on port ${port}`);
  } else {
    await app.init();
    console.log(`Worker is running...`);
  }
}

bootstrap();
