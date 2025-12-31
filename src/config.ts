export interface Config {
    // The URL to the webhook
    webhook: string;
    // The token for the webhook
    token: string;
    // Revision
    revision: number;
    // Enable consent analysis
    consent_analysis?: boolean;
}

const StorageKey = "ship_config";
const DefaultConfig: Config = {
    webhook: "",
    token: "",
    revision: 1,
    consent_analysis: true,
}

export function read_config(): Config {
    var config = localStorage.getItem(StorageKey);
    if (config === null) {
        return DefaultConfig;
    }
    try {
        const obj = JSON.parse(config);
        const cfg = DefaultConfig;
        if (obj.webhook && typeof obj.webhook === "string") {
            cfg.webhook = obj.webhook;
        }
        if (obj.token && typeof obj.token === "string") {
            cfg.token = obj.token;
        }
        if (obj.revision && typeof obj.revision === "number") {
            cfg.revision = obj.revision;
        }
        if (obj.consent_analysis && typeof obj.consent_analysis === "boolean") {
            cfg.consent_analysis = obj.consent_analysis;
        }
        return cfg;
    } catch (e) {
        return DefaultConfig;
    }
}

export function write_config(cfg: Config) {
    localStorage.setItem(StorageKey, JSON.stringify(cfg));
}
