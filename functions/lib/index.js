"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduledDelivery = exports.api = exports.createNestServer = void 0;
const core_1 = require("@nestjs/core");
const platform_express_1 = require("@nestjs/platform-express");
const common_1 = require("@nestjs/common");
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const v2_1 = require("firebase-functions/v2");
const express = require("express");
const dotenv = require("dotenv");
const app_module_1 = require("./app.module");
const delivery_service_1 = require("./delivery/delivery.service");
// Load environment variables
dotenv.config();
// Set global options for all functions
(0, v2_1.setGlobalOptions)({
    region: 'asia-northeast1', // Tokyo region
    maxInstances: 10,
});
const server = express();
const createNestServer = async (expressInstance) => {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, new platform_express_1.ExpressAdapter(expressInstance), { logger: ['error', 'warn', 'log'] });
    app.useGlobalPipes(new common_1.ValidationPipe({
        transform: true,
        whitelist: true,
    }));
    app.enableCors({
        origin: true,
        credentials: true,
    });
    await app.init();
    return app;
};
exports.createNestServer = createNestServer;
(0, exports.createNestServer)(server)
    .then(() => console.log('Nest Ready'))
    .catch(err => console.error('Nest broken', err));
// Main API function
exports.api = (0, https_1.onRequest)({
    timeoutSeconds: 540,
    memory: '1GiB',
}, server);
// Scheduled delivery function - runs every day at 5 AM JST
exports.scheduledDelivery = (0, scheduler_1.onSchedule)({
    schedule: '0 5 * * *',
    timeZone: 'Asia/Tokyo',
    memory: '1GiB',
    timeoutSeconds: 540,
}, async (event) => {
    console.log('Starting scheduled delivery...');
    try {
        const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
        const deliveryService = app.get(delivery_service_1.DeliveryService);
        await deliveryService.handleScheduledDelivery();
        console.log('Scheduled delivery completed successfully');
        await app.close();
    }
    catch (error) {
        console.error('Scheduled delivery failed:', error);
        throw error;
    }
});
//# sourceMappingURL=index.js.map