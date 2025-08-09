"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliveryTestController = exports.DeliveryController = void 0;
const common_1 = require("@nestjs/common");
const delivery_service_1 = require("./delivery.service");
const auth_guard_1 = require("../auth/auth.guard");
let DeliveryController = class DeliveryController {
    constructor(deliveryService) {
        this.deliveryService = deliveryService;
    }
    async instantDeliverySetting(req, settingId) {
        await this.deliveryService.instantDelivery(req.user.uid, settingId);
        return { message: 'Instant delivery initiated for setting' };
    }
    async instantDeliveryAll(req) {
        await this.deliveryService.instantDelivery(req.user.uid);
        return { message: 'Instant delivery initiated for all settings' };
    }
    async getDeliveryLogs(req, limit, status, deliveryType, startDate, endDate, searchText, categoryName, sortBy, sortOrder) {
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
    async getDeliveryLogDetail(req, logId) {
        const log = await this.deliveryService.getDeliveryLogById(req.user.uid, logId);
        if (!log) {
            return { error: 'Delivery log not found' };
        }
        return { log };
    }
    async getDeliveryHistory(req, categoryName, limit) {
        const history = await this.deliveryService.getDeliveryHistoryByCategoryName(req.user.uid, decodeURIComponent(categoryName), limit ? parseInt(limit, 10) : 20);
        return { history };
    }
    // New endpoints for in-app content delivery
    async instantContentDeliveryAll(req) {
        const result = await this.deliveryService.instantContentDelivery(req.user.uid);
        return result;
    }
    async instantContentDeliverySetting(req, settingId) {
        const result = await this.deliveryService.instantContentDelivery(req.user.uid, settingId);
        return result;
    }
    async getContentArchive(req, limit, categoryName, startDate, endDate, searchText, sortBy, sortOrder) {
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
    async batchDeleteDeliveryLogs(req, body) {
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
    async deleteDeliveryLog(req, logId) {
        const result = await this.deliveryService.deleteDeliveryLog(req.user.uid, logId);
        if (!result.success) {
            return { error: result.error };
        }
        return { message: 'Content deleted successfully' };
    }
    // Data integrity management endpoints (admin only)
    async checkDataIntegrity() {
        const result = await this.deliveryService.checkDataIntegrity();
        return result;
    }
    async cleanupOrphanedSettings() {
        const result = await this.deliveryService.cleanupOrphanedSettings();
        return {
            message: `Cleanup completed: ${result.removedSettings.length} orphaned settings removed`,
            removedSettings: result.removedSettings,
            errors: result.errors.length > 0 ? result.errors : undefined
        };
    }
};
exports.DeliveryController = DeliveryController;
__decorate([
    (0, common_1.Post)('instant/:settingId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('settingId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], DeliveryController.prototype, "instantDeliverySetting", null);
__decorate([
    (0, common_1.Post)('instant/all'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DeliveryController.prototype, "instantDeliveryAll", null);
__decorate([
    (0, common_1.Get)('logs'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('deliveryType')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __param(6, (0, common_1.Query)('searchText')),
    __param(7, (0, common_1.Query)('categoryName')),
    __param(8, (0, common_1.Query)('sortBy')),
    __param(9, (0, common_1.Query)('sortOrder')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], DeliveryController.prototype, "getDeliveryLogs", null);
__decorate([
    (0, common_1.Get)('logs/:logId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('logId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], DeliveryController.prototype, "getDeliveryLogDetail", null);
__decorate([
    (0, common_1.Get)('history/:categoryName'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('categoryName')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], DeliveryController.prototype, "getDeliveryHistory", null);
__decorate([
    (0, common_1.Post)('content/all'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DeliveryController.prototype, "instantContentDeliveryAll", null);
__decorate([
    (0, common_1.Post)('content/:settingId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('settingId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], DeliveryController.prototype, "instantContentDeliverySetting", null);
__decorate([
    (0, common_1.Get)('archive'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('categoryName')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __param(5, (0, common_1.Query)('searchText')),
    __param(6, (0, common_1.Query)('sortBy')),
    __param(7, (0, common_1.Query)('sortOrder')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], DeliveryController.prototype, "getContentArchive", null);
__decorate([
    (0, common_1.Delete)('logs/batch'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DeliveryController.prototype, "batchDeleteDeliveryLogs", null);
__decorate([
    (0, common_1.Delete)('logs/:logId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('logId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], DeliveryController.prototype, "deleteDeliveryLog", null);
__decorate([
    (0, common_1.Get)('admin/data-integrity'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DeliveryController.prototype, "checkDataIntegrity", null);
__decorate([
    (0, common_1.Post)('admin/cleanup-orphaned'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DeliveryController.prototype, "cleanupOrphanedSettings", null);
exports.DeliveryController = DeliveryController = __decorate([
    (0, common_1.Controller)('delivery'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __metadata("design:paramtypes", [delivery_service_1.DeliveryService])
], DeliveryController);
// Separate controller for testing without auth guard
let DeliveryTestController = class DeliveryTestController {
    constructor(deliveryService) {
        this.deliveryService = deliveryService;
    }
    async testCheckDataIntegrity() {
        const result = await this.deliveryService.checkDataIntegrity();
        return result;
    }
    async testCleanupOrphanedSettings() {
        const result = await this.deliveryService.cleanupOrphanedSettings();
        return {
            message: `Cleanup completed: ${result.removedSettings.length} orphaned settings removed`,
            removedSettings: result.removedSettings,
            errors: result.errors.length > 0 ? result.errors : undefined
        };
    }
    async testScheduledDelivery() {
        await this.deliveryService.handleScheduledDelivery();
        return { message: 'Test scheduled delivery completed' };
    }
};
exports.DeliveryTestController = DeliveryTestController;
__decorate([
    (0, common_1.Get)('data-integrity'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DeliveryTestController.prototype, "testCheckDataIntegrity", null);
__decorate([
    (0, common_1.Post)('cleanup-orphaned'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DeliveryTestController.prototype, "testCleanupOrphanedSettings", null);
__decorate([
    (0, common_1.Post)('test-scheduled-delivery'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DeliveryTestController.prototype, "testScheduledDelivery", null);
exports.DeliveryTestController = DeliveryTestController = __decorate([
    (0, common_1.Controller)('delivery-test'),
    __metadata("design:paramtypes", [delivery_service_1.DeliveryService])
], DeliveryTestController);
//# sourceMappingURL=delivery.controller.js.map