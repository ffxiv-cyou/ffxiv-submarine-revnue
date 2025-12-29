
import overlayToolkit from "overlay-toolkit";

export function kdocs_webhook(url: string, token: string, argv: any) {
    return overlayToolkit.Fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "AirScript-Token": token
        },
        body: JSON.stringify({
            Context: {
                argv: argv
            },
        }),
    });
}
