import * as request from "superagent";
import * as types from "../shared/types";

export class TokenRefresher {
    constructor(private tenant_id: string, private client_id: string, private client_secret: string, private scope: string) {
    }
    private processJSONResponse<T>(response: request.Response) {
        if (response.status === 200) {
            return JSON.parse(response.text) as T;
        } else {
            throw response.text;
        }
    }
    private async getOpenIDMetadata() {
        const response = await request.get(`https://login.microsoftonline.com/${this.tenant_id}/v2.0/.well-known/openid-configuration`)
        return this.processJSONResponse<types.OpenIDMetadata>(response);
    }
    async refresh(refresh_token: string) {
        const metaData = await this.getOpenIDMetadata();
        const response = await request.post(metaData.token_endpoint)
        .type('form')
        .send({
            client_id: this.client_id
            ,scope: this.scope
            ,refresh_token
            ,grant_type: "refresh_token"
            ,client_secret: this.client_secret
        });
        return this.processJSONResponse<types.ADTokenResponse>(response);
    }
}