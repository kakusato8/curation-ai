import { Controller, Post, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
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
  async getDeliveryLogs(@Request() req, @Query('limit') limit?: string) {
    const logs = await this.deliveryService.getDeliveryLogs(
      req.user.uid, 
      limit ? parseInt(limit, 10) : 50
    );
    return { logs };
  }

  @Get('logs/:logId')
  async getDeliveryLogDetail(@Request() req, @Param('logId') logId: string) {
    const log = await this.deliveryService.getDeliveryLogById(req.user.uid, logId);
    if (!log) {
      return { error: 'Delivery log not found' };
    }
    return { log };
  }

  @Get('history/:categoryName')
  async getDeliveryHistory(
    @Request() req, 
    @Param('categoryName') categoryName: string,
    @Query('limit') limit?: string
  ) {
    const history = await this.deliveryService.getDeliveryHistoryByCategoryName(
      req.user.uid, 
      decodeURIComponent(categoryName),
      limit ? parseInt(limit, 10) : 20
    );
    return { history };
  }
}