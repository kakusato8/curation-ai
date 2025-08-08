import { Module } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { DeliveryController } from './delivery.controller';
import { FirebaseModule } from '../firebase/firebase.module';
import { SettingsModule } from '../settings/settings.module';
import { GeminiModule } from '../gemini/gemini.module';
import { EmailModule } from '../email/email.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [FirebaseModule, SettingsModule, GeminiModule, EmailModule, AuthModule],
  controllers: [DeliveryController],
  providers: [DeliveryService],
  exports: [DeliveryService],
})
export class DeliveryModule {}