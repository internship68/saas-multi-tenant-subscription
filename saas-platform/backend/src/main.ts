import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import { ResponseInterceptor } from './shared/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Required for Stripe webhook signature validation.
    // Makes req.rawBody (Buffer) available alongside parsed JSON body.
    // Does NOT affect JSON parsing for other routes.
    rawBody: true,
  });


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

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
