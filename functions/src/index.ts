import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule, ScheduledEvent } from 'firebase-functions/v2/scheduler';
import { setGlobalOptions } from 'firebase-functions/v2';
import * as express from 'express';
import * as dotenv from 'dotenv';
import { AppModule } from './app.module';
import { DeliveryService } from './delivery/delivery.service';

// Load environment variables
dotenv.config();

// Set global options for all functions
setGlobalOptions({
  region: 'asia-northeast1', // Tokyo region
  maxInstances: 10,
});

const server = express();

export const createNestServer = async (expressInstance: express.Express) => {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressInstance),
    { logger: ['error', 'warn', 'log'] }
  );

  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
  }));

  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Set global prefix for API routes
  app.setGlobalPrefix('api');

  await app.init();
  return app;
};

createNestServer(server)
  .then(() => console.log('Nest Ready'))
  .catch(err => console.error('Nest broken', err));

// Main API function
export const api = onRequest({
  timeoutSeconds: 540,
  memory: '1GiB',
  invoker: 'public',
}, server);

// Scheduled delivery function - runs every day at 5 AM JST
export const scheduledDelivery = onSchedule({
  schedule: '0 5 * * *',
  timeZone: 'Asia/Tokyo',
  memory: '1GiB',
  timeoutSeconds: 540,
}, async (event: ScheduledEvent) => {
  console.log('Starting scheduled delivery...');
  
  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    const deliveryService = app.get(DeliveryService);
    await deliveryService.handleScheduledDelivery();
    console.log('Scheduled delivery completed successfully');
    await app.close();
  } catch (error) {
    console.error('Scheduled delivery failed:', error);
    throw error;
  }
});