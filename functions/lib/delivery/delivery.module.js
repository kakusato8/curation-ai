"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliveryModule = void 0;
const common_1 = require("@nestjs/common");
const delivery_service_1 = require("./delivery.service");
const delivery_controller_1 = require("./delivery.controller");
const firebase_module_1 = require("../firebase/firebase.module");
const settings_module_1 = require("../settings/settings.module");
const gemini_module_1 = require("../gemini/gemini.module");
const email_module_1 = require("../email/email.module");
const auth_module_1 = require("../auth/auth.module");
let DeliveryModule = class DeliveryModule {
};
exports.DeliveryModule = DeliveryModule;
exports.DeliveryModule = DeliveryModule = __decorate([
    (0, common_1.Module)({
        imports: [firebase_module_1.FirebaseModule, settings_module_1.SettingsModule, gemini_module_1.GeminiModule, email_module_1.EmailModule, auth_module_1.AuthModule],
        controllers: [delivery_controller_1.DeliveryController],
        providers: [delivery_service_1.DeliveryService],
        exports: [delivery_service_1.DeliveryService],
    })
], DeliveryModule);
//# sourceMappingURL=delivery.module.js.map