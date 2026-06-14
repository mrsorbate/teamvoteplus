"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = registerRoutes;
const auth_1 = __importDefault(require("./auth"));
const teams_1 = __importDefault(require("./teams"));
const events_1 = __importDefault(require("./events"));
const stats_1 = __importDefault(require("./stats"));
const invites_1 = __importDefault(require("./invites"));
const admin_1 = __importDefault(require("./admin"));
const profile_1 = __importDefault(require("./profile"));
const settings_1 = __importDefault(require("./settings"));
const notifications_1 = __importDefault(require("./notifications"));
const posts_1 = __importDefault(require("./posts"));
function registerRoutes(app, authLimiter) {
    app.use('/api/auth', authLimiter, auth_1.default);
    app.use('/api/teams', teams_1.default);
    app.use('/api/events', events_1.default);
    app.use('/api/stats', stats_1.default);
    app.use('/api/settings', settings_1.default);
    app.use('/api/notifications', notifications_1.default);
    app.use('/api', invites_1.default);
    app.use('/api', posts_1.default);
    app.use('/api/admin', admin_1.default);
    app.use('/api/profile', profile_1.default);
}
//# sourceMappingURL=index.js.map