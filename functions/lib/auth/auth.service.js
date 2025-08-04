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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const firebase_service_1 = require("../firebase/firebase.service");
let AuthService = class AuthService {
    constructor(firebaseService) {
        this.firebaseService = firebaseService;
    }
    async validateUser(idToken) {
        try {
            const decodedToken = await this.firebaseService.verifyIdToken(idToken);
            return decodedToken;
        }
        catch (_a) {
            throw new common_1.UnauthorizedException('Invalid token');
        }
    }
    async createUser(createUserDto) {
        const firestore = this.firebaseService.getFirestore();
        const userRef = firestore.collection('users').doc(createUserDto.uid);
        const userData = {
            uid: createUserDto.uid,
            email: createUserDto.email,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        await userRef.set(userData);
        return userData;
    }
    async getUser(uid) {
        const firestore = this.firebaseService.getFirestore();
        const userDoc = await firestore.collection('users').doc(uid).get();
        if (!userDoc.exists) {
            return null;
        }
        return Object.assign({ id: userDoc.id }, userDoc.data());
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [firebase_service_1.FirebaseService])
], AuthService);
//# sourceMappingURL=auth.service.js.map