import { Controller, Post, Get, Delete, Param, Query, UseGuards, Request, Body } from '@nestjs/common';
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
  @Post('content/all')
  async instantContentDeliveryAll(@Request() req: AuthenticatedRequest): Promise<BatchDeliveryResponse> {
    const result = await this.deliveryService.instantContentDelivery(req.user.uid);
    return result as BatchDeliveryResponse;
  }

  @Post('content/:settingId')
  async instantContentDeliverySetting(@Request() req: AuthenticatedRequest, @Param('settingId') settingId: string): Promise<DeliveryContentResponse> {
    const result = await this.deliveryService.instantContentDelivery(req.user.uid, settingId);
    return result as DeliveryContentResponse;
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

  @Delete('logs/batch')
  async batchDeleteDeliveryLogs(
    @Request() req: AuthenticatedRequest, 
    @Body() body: { logIds: string[] }
  ) {
    console.log('=== BATCH DELETE CONTROLLER START ===');
    console.log('Request user UID:', req.user.uid);
    console.log('Request body:', body);
    
    const { logIds } = body;
    
    if (!logIds || !Array.isArray(logIds) || logIds.length === 0) {
      console.log('Invalid logIds array, returning error');
      return { error: 'logIds array is required and must not be empty' };
    }

    console.log('Calling deliveryService.batchDeleteDeliveryLogs with:', req.user.uid, logIds);
    const result = await this.deliveryService.batchDeleteDeliveryLogs(req.user.uid, logIds);
    console.log('Service returned result:', result);
    
    const response = {
      message: `${result.successful} content items deleted successfully`,
      successful: result.successful,
      failed: result.failed,
      deletedIds: result.deletedIds,
      errors: result.errors.length > 0 ? result.errors : undefined
    };
    
    console.log('Controller returning response:', response);
    console.log('=== BATCH DELETE CONTROLLER END ===');
    return response;
  }

  @Delete('logs/:logId')
  async deleteDeliveryLog(@Request() req: AuthenticatedRequest, @Param('logId') logId: string) {
    const result = await this.deliveryService.deleteDeliveryLog(req.user.uid, logId);
    if (!result.success) {
      return { error: result.error };
    }
    return { message: 'Content deleted successfully' };
  }

  // Data integrity management endpoints (admin only)
  @Get('admin/data-integrity')
  async checkDataIntegrity() {
    const result = await this.deliveryService.checkDataIntegrity();
    return result;
  }

  @Post('admin/cleanup-orphaned')
  async cleanupOrphanedSettings() {
    const result = await this.deliveryService.cleanupOrphanedSettings();
    return {
      message: `Cleanup completed: ${result.removedSettings.length} orphaned settings removed`,
      removedSettings: result.removedSettings,
      errors: result.errors.length > 0 ? result.errors : undefined
    };
  }

}

// Separate controller for testing without auth guard
@Controller('delivery-test')
export class DeliveryTestController {
  constructor(private deliveryService: DeliveryService) {}

  @Get('data-integrity')
  async testCheckDataIntegrity() {
    const result = await this.deliveryService.checkDataIntegrity();
    return result;
  }

  @Post('cleanup-orphaned')
  async testCleanupOrphanedSettings() {
    const result = await this.deliveryService.cleanupOrphanedSettings();
    return {
      message: `Cleanup completed: ${result.removedSettings.length} orphaned settings removed`,
      removedSettings: result.removedSettings,
      errors: result.errors.length > 0 ? result.errors : undefined
    };
  }

  @Post('test-scheduled-delivery')
  async testScheduledDelivery() {
    await this.deliveryService.handleScheduledDelivery();
    return { message: 'Test scheduled delivery completed' };
  }
}