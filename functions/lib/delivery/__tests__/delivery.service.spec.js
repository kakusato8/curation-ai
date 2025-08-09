"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const delivery_service_1 = require("../delivery.service");
const firebase_service_1 = require("../../firebase/firebase.service");
const settings_service_1 = require("../../settings/settings.service");
const gemini_service_1 = require("../../gemini/gemini.service");
const common_1 = require("@nestjs/common");
describe('DeliveryService', () => {
    let service;
    let firebaseService;
    let settingsService;
    let geminiService;
    let mockFirestore;
    const mockUserSetting = {
        id: 'setting-1',
        categoryName: 'Test Category',
        geminiQuery: 'Test query',
        frequency: 'daily',
    };
    const mockUserSettings = {
        userId: 'user-1',
        settings: [mockUserSetting],
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    beforeEach(async () => {
        // Firestore モックの設定
        mockFirestore = {
            collection: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn(),
            doc: jest.fn().mockReturnThis(),
            add: jest.fn(),
            delete: jest.fn(),
        };
        const mockFirebaseService = {
            getFirestore: jest.fn().mockReturnValue(mockFirestore),
        };
        const mockSettingsService = {
            getUserSettings: jest.fn(),
        };
        const mockGeminiService = {
            generateContent: jest.fn(),
        };
        const module = await testing_1.Test.createTestingModule({
            providers: [
                delivery_service_1.DeliveryService,
                {
                    provide: firebase_service_1.FirebaseService,
                    useValue: mockFirebaseService,
                },
                {
                    provide: settings_service_1.SettingsService,
                    useValue: mockSettingsService,
                },
                {
                    provide: gemini_service_1.GeminiService,
                    useValue: mockGeminiService,
                },
            ],
        }).compile();
        service = module.get(delivery_service_1.DeliveryService);
        firebaseService = module.get(firebase_service_1.FirebaseService);
        settingsService = module.get(settings_service_1.SettingsService);
        geminiService = module.get(gemini_service_1.GeminiService);
        // Logger のモック
        jest.spyOn(common_1.Logger.prototype, 'log').mockImplementation();
        jest.spyOn(common_1.Logger.prototype, 'error').mockImplementation();
        jest.spyOn(common_1.Logger.prototype, 'warn').mockImplementation();
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
    describe('instantContentDelivery', () => {
        it('should generate content for single setting', async () => {
            const userId = 'user-1';
            const settingId = 'setting-1';
            const mockContent = 'Generated test content';
            settingsService.getUserSettings.mockResolvedValue(mockUserSettings);
            geminiService.generateContent.mockResolvedValue(mockContent);
            mockFirestore.add.mockResolvedValue({ id: 'log-id' });
            const result = await service.instantContentDelivery(userId, settingId);
            expect(result).toEqual({
                settingId: 'setting-1',
                categoryName: 'Test Category',
                content: mockContent,
                query: 'Test query',
                generatedAt: expect.any(Date),
                success: true,
            });
            expect(settingsService.getUserSettings).toHaveBeenCalledWith(userId);
            expect(geminiService.generateContent).toHaveBeenCalledWith('Test query');
            expect(mockFirestore.collection).toHaveBeenCalledWith('delivery_logs');
            expect(mockFirestore.add).toHaveBeenCalled();
        });
        it('should generate content for all settings', async () => {
            const userId = 'user-1';
            const mockContent = 'Generated test content';
            settingsService.getUserSettings.mockResolvedValue(mockUserSettings);
            geminiService.generateContent.mockResolvedValue(mockContent);
            mockFirestore.add.mockResolvedValue({ id: 'log-id' });
            const result = await service.instantContentDelivery(userId);
            expect(result).toMatchObject({
                contents: [{
                        settingId: 'setting-1',
                        categoryName: 'Test Category',
                        content: mockContent,
                        query: 'Test query',
                        generatedAt: expect.any(Date),
                        success: true,
                    }],
                totalProcessed: 1,
                successful: 1,
                failed: 0,
                errors: [],
                generatedAt: expect.any(Date),
            });
            expect(settingsService.getUserSettings).toHaveBeenCalledWith(userId);
            expect(geminiService.generateContent).toHaveBeenCalledWith('Test query');
        });
        it('should handle content generation error', async () => {
            const userId = 'user-1';
            const settingId = 'setting-1';
            const error = new Error('Generation failed');
            settingsService.getUserSettings.mockResolvedValue(mockUserSettings);
            geminiService.generateContent.mockRejectedValue(error);
            mockFirestore.add.mockResolvedValue({ id: 'log-id' });
            const result = await service.instantContentDelivery(userId, settingId);
            expect(result).toEqual({
                settingId: 'setting-1',
                categoryName: 'Test Category',
                content: '',
                query: 'Test query',
                generatedAt: expect.any(Date),
                success: false,
                error: 'Generation failed',
            });
            expect(mockFirestore.add).toHaveBeenCalledWith(expect.objectContaining({
                status: 'failed',
                errorMessage: 'Generation failed',
            }));
        });
        it('should throw error when user settings not found', async () => {
            const userId = 'user-1';
            const settingId = 'setting-1';
            settingsService.getUserSettings.mockResolvedValue(null);
            await expect(service.instantContentDelivery(userId, settingId)).rejects.toThrow('No settings found for user');
        });
        it('should throw error when specific setting not found', async () => {
            const userId = 'user-1';
            const settingId = 'non-existent-setting';
            settingsService.getUserSettings.mockResolvedValue(mockUserSettings);
            await expect(service.instantContentDelivery(userId, settingId)).rejects.toThrow('Setting not found');
        });
    });
    describe('getDeliveryLogs', () => {
        it('should fetch delivery logs with default options', async () => {
            const userId = 'user-1';
            const mockLogs = [{
                    id: 'log-1',
                    userId,
                    categoryName: 'Test Category',
                    deliveredAt: new Date().toISOString(),
                    status: 'success',
                }];
            mockFirestore.get.mockResolvedValue({
                docs: mockLogs.map(log => ({
                    id: log.id,
                    data: () => log,
                })),
            });
            const result = await service.getDeliveryLogs(userId);
            expect(result).toEqual(mockLogs.map(log => (Object.assign({ id: log.id }, log))));
            expect(mockFirestore.collection).toHaveBeenCalledWith('delivery_logs');
            expect(mockFirestore.where).toHaveBeenCalledWith('userId', '==', userId);
            expect(mockFirestore.orderBy).toHaveBeenCalledWith('deliveredAt', 'desc');
            expect(mockFirestore.limit).toHaveBeenCalledWith(100); // fetchLimit
        });
        it('should apply client-side filters', async () => {
            const userId = 'user-1';
            const mockLogs = [
                {
                    id: 'log-1',
                    userId,
                    categoryName: 'Category A',
                    deliveredAt: new Date().toISOString(),
                    status: 'success',
                    deliveryType: 'instant',
                },
                {
                    id: 'log-2',
                    userId,
                    categoryName: 'Category B',
                    deliveredAt: new Date().toISOString(),
                    status: 'failed',
                    deliveryType: 'scheduled',
                },
            ];
            mockFirestore.get.mockResolvedValue({
                docs: mockLogs.map(log => ({
                    id: log.id,
                    data: () => log,
                })),
            });
            const result = await service.getDeliveryLogs(userId, {
                status: 'success',
                deliveryType: 'instant',
                categoryName: 'Category A',
            });
            // フィルターが適用されてlog-1のみが返される
            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                id: 'log-1',
                categoryName: 'Category A',
                status: 'success',
                deliveryType: 'instant',
            });
        });
        it('should handle search text filter', async () => {
            const userId = 'user-1';
            const mockLogs = [
                {
                    id: 'log-1',
                    userId,
                    categoryName: 'Tech News',
                    fullContent: 'Latest technology updates',
                    deliveredAt: new Date().toISOString(),
                    status: 'success',
                },
                {
                    id: 'log-2',
                    userId,
                    categoryName: 'Sports',
                    fullContent: 'Football match results',
                    deliveredAt: new Date().toISOString(),
                    status: 'success',
                },
            ];
            mockFirestore.get.mockResolvedValue({
                docs: mockLogs.map(log => ({
                    id: log.id,
                    data: () => log,
                })),
            });
            const result = await service.getDeliveryLogs(userId, {
                searchText: 'technology',
            });
            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                id: 'log-1',
                categoryName: 'Tech News',
            });
        });
    });
    describe('deleteDeliveryLog', () => {
        it('should delete delivery log successfully', async () => {
            const userId = 'user-1';
            const logId = 'log-1';
            mockFirestore.doc.mockReturnValue({
                get: jest.fn().mockResolvedValue({
                    exists: true,
                    data: () => ({ userId, categoryName: 'Test' }),
                }),
                delete: jest.fn().mockResolvedValue(undefined),
            });
            const result = await service.deleteDeliveryLog(userId, logId);
            expect(result).toEqual({ success: true });
            expect(mockFirestore.collection).toHaveBeenCalledWith('delivery_logs');
            expect(mockFirestore.doc).toHaveBeenCalledWith(logId);
        });
        it('should reject unauthorized deletion', async () => {
            const userId = 'user-1';
            const logId = 'log-1';
            mockFirestore.doc.mockReturnValue({
                get: jest.fn().mockResolvedValue({
                    exists: true,
                    data: () => ({ userId: 'different-user' }),
                }),
            });
            const result = await service.deleteDeliveryLog(userId, logId);
            expect(result).toEqual({
                success: false,
                error: 'Unauthorized: You can only delete your own content',
            });
        });
        it('should handle non-existent log', async () => {
            const userId = 'user-1';
            const logId = 'non-existent-log';
            mockFirestore.doc.mockReturnValue({
                get: jest.fn().mockResolvedValue({
                    exists: false,
                }),
            });
            const result = await service.deleteDeliveryLog(userId, logId);
            expect(result).toEqual({
                success: false,
                error: 'Content not found',
            });
        });
    });
    describe('batchDeleteDeliveryLogs', () => {
        it('should batch delete multiple logs successfully', async () => {
            const userId = 'user-1';
            const logIds = ['log-1', 'log-2', 'log-3'];
            // Mock successful deletion for all logs
            mockFirestore.doc.mockImplementation((logId) => ({
                get: jest.fn().mockResolvedValue({
                    exists: true,
                    data: () => ({ userId, categoryName: 'Test' }),
                }),
                delete: jest.fn().mockResolvedValue(undefined),
            }));
            const result = await service.batchDeleteDeliveryLogs(userId, logIds);
            expect(result).toEqual({
                successful: 3,
                failed: 0,
                deletedIds: logIds,
                errors: [],
            });
        });
        it('should handle partial failure in batch deletion', async () => {
            const userId = 'user-1';
            const logIds = ['log-1', 'log-2', 'log-3'];
            // Mock: log-1 and log-3 succeed, log-2 fails
            mockFirestore.doc.mockImplementation((logId) => {
                if (logId === 'log-2') {
                    return {
                        get: jest.fn().mockResolvedValue({
                            exists: false,
                        }),
                    };
                }
                return {
                    get: jest.fn().mockResolvedValue({
                        exists: true,
                        data: () => ({ userId, categoryName: 'Test' }),
                    }),
                    delete: jest.fn().mockResolvedValue(undefined),
                };
            });
            const result = await service.batchDeleteDeliveryLogs(userId, logIds);
            expect(result).toEqual({
                successful: 2,
                failed: 1,
                deletedIds: ['log-1', 'log-3'],
                errors: [
                    {
                        logId: 'log-2',
                        error: 'Content not found',
                    },
                ],
            });
        });
    });
    describe('getContentArchive', () => {
        it('should fetch content archive with successful logs only', async () => {
            const userId = 'user-1';
            const mockLogs = [
                {
                    id: 'log-1',
                    userId,
                    categoryName: 'Category A',
                    status: 'success',
                    fullContent: 'Content 1',
                    deliveredAt: new Date().toISOString(),
                },
                {
                    id: 'log-2',
                    userId,
                    categoryName: 'Category B',
                    status: 'success',
                    fullContent: 'Content 2',
                    deliveredAt: new Date().toISOString(),
                },
            ];
            // getDeliveryLogsをスパイして期待される結果を返す
            jest.spyOn(service, 'getDeliveryLogs').mockResolvedValue(mockLogs.map(log => (Object.assign({ id: log.id }, log))));
            const result = await service.getContentArchive(userId);
            expect(result).toEqual({
                logs: mockLogs.map(log => (Object.assign({ id: log.id }, log))),
                totalCount: 2,
                categories: ['Category A', 'Category B'],
            });
            expect(service.getDeliveryLogs).toHaveBeenCalledWith(userId, {
                limit: 50,
                categoryName: undefined,
                startDate: undefined,
                endDate: undefined,
                searchText: undefined,
                status: 'success',
                sortBy: 'deliveredAt',
                sortOrder: 'desc',
            });
        });
        it('should filter out logs without full content', async () => {
            const userId = 'user-1';
            const mockLogs = [
                {
                    id: 'log-1',
                    userId,
                    categoryName: 'Category A',
                    status: 'success',
                    fullContent: 'Content 1',
                    deliveredAt: new Date().toISOString(),
                },
                {
                    id: 'log-2',
                    userId,
                    categoryName: 'Category B',
                    status: 'success',
                    fullContent: '', // 空のコンテンツ
                    deliveredAt: new Date().toISOString(),
                },
                {
                    id: 'log-3',
                    userId,
                    categoryName: 'Category C',
                    status: 'success',
                    // fullContentがない
                    deliveredAt: new Date().toISOString(),
                },
            ];
            jest.spyOn(service, 'getDeliveryLogs').mockResolvedValue(mockLogs.map(log => (Object.assign({ id: log.id }, log))));
            const result = await service.getContentArchive(userId);
            // fullContentがあるログのみが含まれる
            expect(result.logs).toHaveLength(1);
            expect(result.logs[0]).toMatchObject({
                id: 'log-1',
                categoryName: 'Category A',
                fullContent: 'Content 1',
            });
            expect(result.totalCount).toBe(1);
            expect(result.categories).toEqual(['Category A']);
        });
    });
});
//# sourceMappingURL=delivery.service.spec.js.map