import * as sql from "mssql";
import {SessionStore} from "../shared/types";

function connection(config: sql.config) {
    if (config.options && typeof config.options.trustedConnection === "boolean" && config.options.trustedConnection) {
        const nsql = require('mssql/msnodesqlv8');
        return (new nsql.ConnectionPool(config)) as sql.ConnectionPool;
    } else {
        return new sql.ConnectionPool(config);
    }
}

export class SessionDB {
    private connected: Promise<sql.ConnectionPool>;

    constructor(config: sql.config) {
        this.connected = connection(config).connect();
    }
    async reqReady() {
        const pool = await this.connected;
        return pool.request();
    }
    async getAboutToExpireSessions() {
        const req = await this.reqReady();
        const result = await req.query("SELECT [sid], [session] FROM [dbo].[sessions] (NOLOCK) WHERE DATEDIFF(minute, GETUTCDATE(), [token_expire_utc]) < 10");
        return (result.recordset as {sid: string, session: string}[]).map(({sid, session}) => {
            return {sid, sessionStore: JSON.parse(session) as SessionStore};
        });
    }
    async saveSession(sid: string, sessionStore: SessionStore) {
        const req = await this.reqReady();
        await req
        .input("sid", sid)
        .input("session", JSON.stringify(sessionStore))
        .query("UPDATE [dbo].[sessions] SET [session]=@session WHERE [sid]=@sid");
    }
    async deleteTokenExpiredSessions() {
        const req = await this.reqReady();
        await req.query("DELETE FROM [dbo].[sessions] WHERE GETUTCDATE()>[token_expire_utc]");
    }
    async deleteAllSessions() {
        const req = await this.reqReady();
        await req.query("TRUNCATE TABLE [dbo].[sessions]");       
    }
    async close() {
        const pool = await this.connected;
        pool.close();
    }
}