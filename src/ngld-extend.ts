import './ngld/common.js';

export function Fetch(url: string, options: RequestInit = {}): Promise<Response> {
    console.log("Fetching", url, options);
    return callOverlayHandler({
        call: "Fetch",
        resource: url,
        options: options,
    });
}