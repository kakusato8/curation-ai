import { Controller, Post, Get, Param, UseGuards, Request } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('delivery')
@UseGuards(AuthGuard)
export class DeliveryController {
  constructor(private deliveryService: DeliveryService) {}

  @Post('instant/:settingId')
  async instantDeliverySetting(@Request() req, @Param('settingId') settingId: string) {
    await this.deliveryService.instantDelivery(req.user.uid, settingId);
    return { message: 'Instant delivery initiated for setting' };
  }

  @Post('instant/all')
  async instantDeliveryAll(@Request() req) {
    await this.deliveryService.instantDelivery(req.user.uid);
    return { message: 'Instant delivery initiated for all settings' };
  }

  @Get('logs')
  async getDeliveryLogs(@Request() req) {
    const logs = await this.deliveryService.getDeliveryLogs(req.user.uid);
    return { logs };
  }
}