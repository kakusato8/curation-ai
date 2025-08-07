import { Controller, Post, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedRequest } from '../common/interfaces/request.interface';
import { DeliveryContentResponse, BatchDeliveryResponse } from './dto/delivery-content.dto';

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
  async getDeliveryLogs(
    @Request() req: AuthenticatedRequest, 
    @Query('limit') limit?: string,
    @Query('status') status?: 'success' | 'failed',
    @Query('deliveryType') deliveryType?: 'scheduled' | 'instant',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('searchText') searchText?: string,
    @Query('categoryName') categoryName?: string,
    @Query('sortBy') sortBy?: 'deliveredAt' | 'generatedAt',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc'
  ) {
    const options = {
      limit: limit ? parseInt(limit, 10) : 50,
      status,
      deliveryType,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      searchText,
      categoryName,
      sortBy: sortBy || 'deliveredAt',
      sortOrder: sortOrder || 'desc'
    };
    
    const logs = await this.deliveryService.getDeliveryLogs(req.user.uid, options);
    return { logs };
  }

  @Get('logs/:logId')
  async getDeliveryLogDetail(@Request() req: AuthenticatedRequest, @Param('logId') logId: string) {
    const log = await this.deliveryService.getDeliveryLogById(req.user.uid, logId);
    if (!log) {
      return { error: 'Delivery log not found' };
    }
    return { log };
  }

  @Get('history/:categoryName')
  async getDeliveryHistory(
    @Request() req: AuthenticatedRequest, 
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

  // New endpoints for in-app content delivery
  @Post('content/:settingId')
  async instantContentDeliverySetting(@Request() req: AuthenticatedRequest, @Param('settingId') settingId: string): Promise<DeliveryContentResponse> {
    const result = await this.deliveryService.instantContentDelivery(req.user.uid, settingId);
    return result as DeliveryContentResponse;
  }

  @Post('content/all')
  async instantContentDeliveryAll(@Request() req: AuthenticatedRequest): Promise<BatchDeliveryResponse> {
    const result = await this.deliveryService.instantContentDelivery(req.user.uid);
    return result as BatchDeliveryResponse;
  }

  @Get('archive')
  async getContentArchive(
    @Request() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('categoryName') categoryName?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('searchText') searchText?: string,
    @Query('sortBy') sortBy?: 'deliveredAt' | 'generatedAt' | 'categoryName',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc'
  ) {
    const options = {
      limit: limit ? parseInt(limit, 10) : 50,
      categoryName,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      searchText,
      sortBy: sortBy || 'deliveredAt',
      sortOrder: sortOrder || 'desc'
    };
    
    const archive = await this.deliveryService.getContentArchive(req.user.uid, options);
    return archive;
  }
}