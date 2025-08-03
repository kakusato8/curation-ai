import { Module } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { DeliveryController } from './delivery.controller';
import { FirebaseModule } from '../firebase/firebase.module';
import { SettingsModule } from '../settings/settings.module';
import { GeminiModule } from '../gemini/gemini.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [FirebaseModule, SettingsModule, GeminiModule, EmailModule],
  controllers: [DeliveryController],
  providers: [DeliveryService],
  exports: [DeliveryService],
})
export class DeliveryModule {}