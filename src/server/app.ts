/*
environment variables supported:
 1. TENANT_ID (required)
 2. CLIENT_ID (required)
 3. CLIENT_SECRET (required)
 4. APP_REDIRECT_URL (required)
 5. APP_POST_LOGOUT_REDIRECT_URL (required)
 6. RESOURCE_URI (required)
 7. API_BASE_URL (required)
 8. EXPRESS_SESSION_SIGN_SECRET (required)
 9. SESSION_STORE_MSSQL_CONFIG_JSON (required)
10. PORT (optional)
11. HOSTNAME (optional)
12. SSL_CERTIFICATE_FILE (optional)
13. SSL_PRIVATE_KEY_FILE (optional)
14. NODE_ENV development|production|test (optional)
*/
import * as express from "express";
import * as expressSession from "express-session";
import * as http from "http";
import * as https from "https";
import * as fs from "fs";
import * as  bodyParser from "body-parser";
import * as passport from  "passport";
import {OIDCStrategy} from "passport-azure-ad";
import * as path from "path";
import * as types from "../shared/types";
import * as httpProxy from "express-http-proxy-middleware";
const MSSQLStore = require('connect-mssql')(expressSession);
import * as sql from "mssql";
import * as api from "rest-api-client";
import {Session as APISession} from "../shared/api-session";

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

const APP_REDIRECT_URL = process.env["APP_REDIRECT_URL"];
if (!APP_REDIRECT_URL) {
    console.error(`${new Date().toISOString()}: env. var. APP_REDIRECT_URL is not defined`);
    process.exit(1);
}

const APP_POST_LOGOUT_REDIRECT_URL = process.env["APP_POST_LOGOUT_REDIRECT_URL"];
if (!APP_POST_LOGOUT_REDIRECT_URL) {
    console.error(`${new Date().toISOString()}: env. var. APP_POST_LOGOUT_REDIRECT_URL is not defined`);
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

const API_BASE_URL = process.env["API_BASE_URL"];
if (!API_BASE_URL) {
    console.error(`${new Date().toISOString()}: env. var. API_BASE_URL is not defined`);
    process.exit(1);
}
/////////////////////////////////////////////////////////////////////

// expression-session settings
/////////////////////////////////////////////////////////////////////
const EXPRESS_SESSION_SIGN_SECRET = process.env["EXPRESS_SESSION_SIGN_SECRET"];
if (!EXPRESS_SESSION_SIGN_SECRET) {
    console.error(`${new Date().toISOString()}: env. var. EXPRESS_SESSION_SIGN_SECRET is not defined`);
    process.exit(1);
}
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

const expressSessionOption: expressSession.SessionOptions = {
    secret: EXPRESS_SESSION_SIGN_SECRET
    ,resave: false
    ,saveUninitialized: false
    ,store: new MSSQLStore(sessionStoreMSSqlConfig)
    ,cookie: {}
};

const OPENID_CONNECT_SCOPES = ["openid", "email", "profile", "offline_access"]; // OIDC scopes
const scope = OPENID_CONNECT_SCOPES.concat([RESOURCE_SCOPE]);

type UserId = types.UserSessionStore;

interface User {
    id: string;
    name: string;
}

passport.serializeUser<types.UserSessionStore, UserId>((ss, done) => {
    const id: UserId = ss;
    done(null, id);
});

passport.deserializeUser<User, UserId>((id, done) => {
    const user: User = {id: id.id, name: id.name};
    done(null, user);
});

passport.use(new OIDCStrategy({
    identityMetadata: `https://login.microsoftonline.com/${TENANT_ID}/v2.0/.well-known/openid-configuration`,
    clientID: CLIENT_ID,
    responseType: "code",
    responseMode: "form_post",
    redirectUrl: APP_REDIRECT_URL,
    allowHttpForRedirectUrl: true,
    clientSecret: CLIENT_SECRET,
    validateIssuer: false,
    isB2C: false,
    issuer: null,
    passReqToCallback: false,
    scope,
    loggingLevel: "info",
    nonceLifetime: null,
    nonceMaxAmount: 5,
    useCookieInsteadOfSession: false,
    cookieEncryptionKeys: null,
    clockSkew: null,
}, (iss, sub, profile, jwtClaims, access_token, refresh_token, params: types.ADTokenResponse, done) => {
    //console.log(`${new Date().toISOString()}: in <<verify()>>\nprofile=${JSON.stringify(profile, null, 2)}\njwtClaims=${JSON.stringify(jwtClaims, null, 2)}\nparams=${JSON.stringify(params, null, 2)}`);
    const tokenExpireTime = new Date(new Date().getTime() + (params.expires_in * 1000.0));
    const user = {id: profile.oid, name: profile.displayName};
    const sessionStore: types.UserSessionStore = {
        id: user.id
        ,name: user.name
        ,token_type: params.token_type
        ,access_token: access_token
        ,refresh_token: refresh_token
        ,token_expire_utc: tokenExpireTime.toISOString()
    };
    console.log(`${new Date().toISOString()}: access token <<ACQUIRED>> for user ${JSON.stringify(user)}, expiration=${tokenExpireTime.toISOString()}`);
    done(null, sessionStore);
}));

const app = express();

app.set("x-powered-by", false);

app.use((req, res, next) => {
	console.log(`\n${new Date().toISOString()}: ${req.method} ${req.originalUrl},headers=${JSON.stringify(req.headers)}`);
	next();
});

app.use(express.static(path.join(__dirname, "../../public")));

if (app.get('env') === 'production') {
    app.set('trust proxy', 1) // trust first proxy
    expressSessionOption.cookie.secure = true // serve secure cookies
}
app.use(expressSession(expressSessionOption));
app.use(passport.initialize());
app.use(passport.session());

// login
// traffic: from browser navigation
app.get("/login"
,(req, res, next) => {
    const state = req.query["state"] as string;
    console.log(`${new Date().toISOString()}: in /login, state=${state ? state : "(none)"}`);
    const options: any = {
        customState: state ? state : undefined
        ,failureRedirect: '/'
    }
    passport.authenticate('azuread-openidconnect', options)(req, res, next);
});

// 'POST returnURL'
// `passport.authenticate` will try to authenticate the content returned in
// body (such as authorization code). If authentication fails, user will be
// redirected to '/' (home page); otherwise, it passes to the next middleware.
// traffic: from browser navigation
app.post('/auth/openid/return'
,bodyParser.urlencoded({ extended : true })
,(req, res, next) => {
    console.log(`${new Date().toISOString()}: We received a return from AzureAD.\n<<post_body>>=\n${JSON.stringify(req.body, null, 2)}`);
    next();
}
,(req, res, next) => {
    passport.authenticate('azuread-openidconnect', {failureRedirect: '/'})(req, res, next);   
}
,(req, res) => {
    const {state} = (req.body as {state?: string, code?: string, session_state?: string});
    let stateObj: {path?: string} = null;
    if (state) {
        try {
            stateObj = JSON.parse(state);
        } catch(e) {}
    }
    res.redirect(stateObj && stateObj.path ? stateObj.path : "/");
});

// 'logout' route, logout from passport, and destroy the session with AAD.
// traffic: from browser navigation
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        req.logOut();
        res.redirect(`https://login.microsoftonline.com/common/oauth2/v2.0/logout?
        post_logout_redirect_uri=${encodeURIComponent(APP_POST_LOGOUT_REDIRECT_URL)}`);
    });
});

// /api route proxy support for UI app
// traffic: from browser ajax call
///////////////////////////////////////////////////////////////////////////////
const proxyRet = httpProxy.get({
    targetAcquisition: async (req) => ({targetUrl: `${API_BASE_URL}`})
});
function appendAuthTokenMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
    if (
        req.isAuthenticated()
        && req.session
        && req.session.passport
        && req.session.passport.user
        && req.session.passport.user.token_type
        && req.session.passport.user.access_token
    ) {
        const sessionStore = req.session.passport.user as types.UserSessionStore;
        req.headers["authorization"] = `${sessionStore.token_type} ${sessionStore.access_token}`;
    }
    next();
}
app.use("/api", appendAuthTokenMiddleware, proxyRet.middleware);
///////////////////////////////////////////////////////////////////////////////

function getAPISession(token_type: string, access_token: string) {
    const client = api.Client.init(async () => ({baseUrl: API_BASE_URL, credentialPlacement: "header", credential: {value: `${token_type} ${access_token}`}}));
    return APISession.init(client);
}

// getting information about me
// traffic: browser srcipt link
app.get("/me"
,(req, res, next) => {
    if (!req.isAuthenticated()) {
        res.jsonp(null);
    } else {
        next();
    }
}
,(req, res) => {
    // get real user info here by calling the underlying api with the access token stored in the session store
    const {token_type, access_token} = (req.session.passport.user as types.UserSessionStore);
    getAPISession(token_type, access_token)
    .me()
    .then((user) => {
        res.jsonp(user);
    }).catch((err) => {
        res.jsonp(null);
    });
});

// for session debugging
// traffic: from browser navigation
app.get("/debug-session", (req, res) => {
    res.json({
        authenticated: req.isAuthenticated()
        ,"req.session": JSON.parse(JSON.stringify(req.session))
    });
});

// CATCH_ALL route
app.use(
(req, res, next) => {
    const authenticated = req.isAuthenticated();
    const stateObjJSON = JSON.stringify({path: req.url});
    const redirectUrl = `/${authenticated ? "#" : "login?"}state=${encodeURIComponent(stateObjJSON)}`;
    console.log("");
    console.log(`${new Date().toISOString()}: <<CATCH_ALL>>: ${authenticated ? "" : "NOT "}Authentictated. redirecting to ${redirectUrl}`);
    res.redirect(redirectUrl);
});

// setup the http server
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
let ssl = false;
let server: http.Server = null;
if (process.env["SSL_CERTIFICATE_FILE"]) {
    ssl = true;
    const certificate_file = process.env["SSL_CERTIFICATE_FILE"];
    const private_key_file = process.env["SSL_PRIVATE_KEY_FILE"];
    if (!private_key_file) {
        console.error(`${new Date().toISOString()}: env. var. SSL_PRIVATE_KEY_FILE is not defined`);
        process.exit(1);        
    }
    const certificate = fs.readFileSync(certificate_file, 'utf8');
    const privateKey  = fs.readFileSync(private_key_file, 'utf8');
    const credentials: https.ServerOptions = {
        cert: certificate
        ,key: privateKey
        ,requestCert: false
        ,rejectUnauthorized: false
    };
    server = https.createServer(credentials, app);
} else {
    server = http.createServer(app);
}
const port = ((process.env.PORT as any) as number) || (ssl ? 443 : 8080);
const hostname = process.env.HOSTNAME || "127.0.0.1";
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// start the app service
server.listen(port, hostname, () => {
    console.log(`[${new Date().toISOString()}]: app server listening on ${ssl ? "https://" : "http://"}${hostname}:${port} :-)`);
});