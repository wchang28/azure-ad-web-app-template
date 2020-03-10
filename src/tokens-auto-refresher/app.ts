/*
environment variables supported:
 1. TENANT_ID (required)
 2. CLIENT_ID (required)
 3. CLIENT_SECRET (required)
 4. RESOURCE_URI (required)
 5. SESSION_STORE_MSSQL_CONFIG_JSON (required)
*/
import * as sql from "mssql";
import {SessionDB} from "./db";
import {TokenRefresher} from "./token-refresh";
import * as pp from "periodic-polling";

// application/client settings
/////////////////////////////////////////////////////////////////////
const TENANT_ID = process.env["TENANT_ID"];
if (!TENANT_ID) {
    console.error(`${new Date().toISOString()}: env. var. TENANT_ID is not defined`);
    process.exit(1);
}

const CLIENT_ID = process.env["CLIENT_ID"];
if (!CLIENT_ID) {
    console.error(`${new Date().toISOString()}: env. var. CLIENT_ID is not defined`);
    process.exit(1);
}

const CLIENT_SECRET = process.env["CLIENT_SECRET"];
if (!CLIENT_SECRET) {
    console.error(`${new Date().toISOString()}: env. var. CLIENT_SECRET is not defined`);
    process.exit(1);
}
/////////////////////////////////////////////////////////////////////

// resource/api settings
/////////////////////////////////////////////////////////////////////
const RESOURCE_URI = process.env["RESOURCE_URI"];
if (!RESOURCE_URI) {
    console.error(`${new Date().toISOString()}: env. var. RESOURCE_URI is not defined`);
    process.exit(1);
}

const RESOURCE_SCOPE = `${RESOURCE_URI}/.default`;
/////////////////////////////////////////////////////////////////////

// session store mssql settings
/////////////////////////////////////////////////////////////////////
const SESSION_STORE_MSSQL_CONFIG_JSON = process.env["SESSION_STORE_MSSQL_CONFIG_JSON"];
if (!SESSION_STORE_MSSQL_CONFIG_JSON) {
    console.error(`${new Date().toISOString()}: env. var. SESSION_STORE_MSSQL_CONFIG_JSON is not defined`);
    process.exit(1);
}
const sessionStoreMSSqlConfig = JSON.parse(SESSION_STORE_MSSQL_CONFIG_JSON) as sql.config;
/////////////////////////////////////////////////////////////////////

const REFRESH_INTERVAL_SECS = 60;

const tokenRefresher = new TokenRefresher(TENANT_ID, CLIENT_ID, CLIENT_SECRET, RESOURCE_SCOPE);
const db = new SessionDB(sessionStoreMSSqlConfig);

async function run() {
    console.log(`${new Date().toISOString()}: checking...`);
    const tokenAboutToExpireSessions = await db.getTokenAboutToExpireRenewableSessions();
    if (tokenAboutToExpireSessions.length > 0) {
        console.log(`${new Date().toISOString()}: ${tokenAboutToExpireSessions.length} session need(s) to refresh their tokens`);
    } else {
        console.log(`${new Date().toISOString()}: no session need to refresh their tokens`);
    }
    const ps = tokenAboutToExpireSessions.map(async ({sid, sessionStore}) => {
        try {
            const userStore = sessionStore.passport.user;
            const {token_type, access_token, refresh_token, expires_in} = await tokenRefresher.refresh(userStore.refresh_token);
            const tokenExpireTime = new Date(new Date().getTime() + (expires_in * 1000.0));
            userStore.token_type = token_type;
            userStore.access_token = access_token;
            userStore.refresh_token = refresh_token;
            userStore.token_expire_utc = tokenExpireTime.toISOString();
            //console.log(`sid=${sid},userStore=\n${JSON.stringify(userStore)}`);
            await db.saveSession(sid, sessionStore);
            return {sid, err: null};
        } catch(err) {
            return {sid, err};
        }
    });
    const result = await Promise.all(ps);
    const badSids: {sid: string, err: any}[] = [];
    result.forEach((item) => {
        if (item.err) {
            badSids.push(item);
        }
    });
    if (tokenAboutToExpireSessions.length > 0) {
        if (badSids.length > 0) {
            console.log(`${new Date().toISOString()}: ${badSids.length} session(s) is/are unable to refresh token. badSids=\n${JSON.stringify(badSids, null, 2)}`);
        } else {
            console.log(`${new Date().toISOString()}: all session(s) are refreshed`);
        }
    }
    console.log(`${new Date().toISOString()}: deleting any expired sessions...`);
    await db.deleteExpiredSessions();
    console.log(`${new Date().toISOString()}: done\n`);
}

pp.PeriodicPolling
.get(run, REFRESH_INTERVAL_SECS)
.start();

/*
run()
.then(() => {
    console.log("Done");
    process.exit(0);
}).catch((err: any) => {
    console.error(`!!! Error: ${JSON.stringify(err)}`);
    process.exit(1);
})
*/