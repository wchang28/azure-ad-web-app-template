export interface ADTokenResponse {
    token_type?: string;
    scope?: string;  // space seperated
    expires_in?: number;    // in second
    ext_expires_in?: number;    // in ssecond
    access_token?: string;
    refresh_token?: string;
    id_token?: string;
}

export interface OpenIDMetadata {
    token_endpoint: string;
    authorization_endpoint: string;
}

export interface UserSessionStore {
    id: string; // id of the user
    name: string;   // name of the user
    token_type: string;
    access_token: string;
    refresh_token: string;
    token_expire_time: number;
}

export interface SessionStore {
    cookie: any;
    passport: {
        user: UserSessionStore;
    };
}
