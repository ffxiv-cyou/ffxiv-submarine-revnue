export interface Config {
    // The URL to the webhook
    webhook: string;
    // The token for the webhook
    token: string;
}

const StorageKey = "ship_config";
const DefaultConfig: Config = {
    webhook: "",
    token: "",
}

export function read_config(): Config {
    var config = localStorage.getItem(StorageKey);
    if (config === null) {
        return DefaultConfig;
    }
    try {
        return JSON.parse(config);
    } catch (e) {
        return DefaultConfig;
    }
}

export function write_config(webhook: string, token: string) {
    localStorage.setItem(StorageKey, JSON.stringify({
        webhook: webhook,
        token: token,
    }));
}
