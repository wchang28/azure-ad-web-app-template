import * as api from "rest-api-client";

export class Session {
    private constructor(private client: api.Client) {
    }
    static init(client: api.Client) {
        return new Session(client);
    }
    private get objectHome() {
        return "/v1.0";
    }
    async me() {
        return await this.client.api(`${this.objectHome}/me`).get<any>();
    }
}