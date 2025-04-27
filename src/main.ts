import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors();

  // Global Validation Pipe
  app.useGlobalPipes(new ValidationPipe());

  // Set global prefix
  app.setGlobalPrefix('api'); // Đặt tiền tố 'api' cho tất cả các endpoint

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Hotel & Restaurant Management API')
    .setDescription('API for managing hotel and restaurant operations')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(process.env.PORT || 8000);
  console.log(
    `Application is running on: http://localhost:${process.env.PORT || 8000}`,
  );
}
bootstrap();
