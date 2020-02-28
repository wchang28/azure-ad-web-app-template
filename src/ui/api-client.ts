import * as api from "rest-api-client";

export const client = api.Client.init(async () => ({baseUrl: "/api"}));
