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
exports.DeliveryController = void 0;
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
    async getDeliveryLogs(req) {
        const logs = await this.deliveryService.getDeliveryLogs(req.user.uid);
        return { logs };
    }
    // New endpoints for in-app content delivery
    async instantContentDeliverySetting(req, settingId) {
        const result = await this.deliveryService.instantContentDelivery(req.user.uid, settingId);
        return result;
    }
    async instantContentDeliveryAll(req) {
        const result = await this.deliveryService.instantContentDelivery(req.user.uid);
        return result;
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
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DeliveryController.prototype, "getDeliveryLogs", null);
__decorate([
    (0, common_1.Post)('content/:settingId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('settingId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], DeliveryController.prototype, "instantContentDeliverySetting", null);
__decorate([
    (0, common_1.Post)('content/all'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DeliveryController.prototype, "instantContentDeliveryAll", null);
exports.DeliveryController = DeliveryController = __decorate([
    (0, common_1.Controller)('delivery'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __metadata("design:paramtypes", [delivery_service_1.DeliveryService])
], DeliveryController);
//# sourceMappingURL=delivery.controller.js.map