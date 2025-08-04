import { Controller, Post, Get, Param, UseGuards, Request } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedRequest } from '../common/interfaces/request.interface';

@Controller('delivery')
@UseGuards(AuthGuard)
export class DeliveryController {
  constructor(private deliveryService: DeliveryService) {}

  @Post('instant/:settingId')
  async instantDeliverySetting(@Request() req: AuthenticatedRequest, @Param('settingId') settingId: string) {
    await this.deliveryService.instantDelivery(req.user.uid, settingId);
    return { message: 'Instant delivery initiated for setting' };
  }

  @Post('instant/all')
  async instantDeliveryAll(@Request() req: AuthenticatedRequest) {
    await this.deliveryService.instantDelivery(req.user.uid);
    return { message: 'Instant delivery initiated for all settings' };
  }

  @Get('logs')
  async getDeliveryLogs(@Request() req: AuthenticatedRequest) {
    const logs = await this.deliveryService.getDeliveryLogs(req.user.uid);
    return { logs };
  }
}