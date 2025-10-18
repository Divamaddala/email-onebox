"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEmailRoutes = void 0;
const express_1 = require("express");
const createEmailRoutes = (controller) => {
    const router = (0, express_1.Router)();
    router.get('/sync', controller.syncEmails);
    router.get('/', controller.getAllEmails);
    router.get('/search', controller.searchEmails);
    router.get('/:id', controller.getEmailById);
    router.post('/:id/categorize', controller.categorizeEmail);
    router.post('/:id/suggest-reply', controller.suggestReply);
    return router;
};
exports.createEmailRoutes = createEmailRoutes;
