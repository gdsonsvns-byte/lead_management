export async function sendWhatsappToUser({ apiKey, campaignName, destination, userName, templateParams = [] }: {
    apiKey: string;
    campaignName: string;
    destination: string;
    userName: string;
    templateParams?: string[];
}) {
    try {
        const safeParams = normalizeTemplateParams(templateParams);
        const res = await fetch("https://backend.aisensy.com/campaign/t1/api/v2", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                apiKey,
                campaignName,
                destination,
                userName,
                templateParams: safeParams
            })
        });

        return await res.json();
    } catch (err) {
        console.error("User WhatsApp send failed:", err);
    }
}

export async function sendWhatsappToAdmin({ apiKey, campaignName, destination, userName, templateParams }: {
    apiKey: string;
    campaignName: string;
    destination: string;
    userName: string;
    templateParams: string[];
}) {
    try {
        const safeParams = normalizeTemplateParams(templateParams);
        const res = await fetch("https://backend.aisensy.com/campaign/t1/api/v2", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                apiKey,
                campaignName,
                destination,
                userName,
                templateParams: safeParams,
            })
        });

        return await res.json();
    } catch (err) {
        console.error("Admin WhatsApp send failed:", err);
    }
}


function normalizeTemplateParams(params: any[], emptyValue = "—"): string[] {
    return params.map((p) => {
        if (p === null || p === undefined) return emptyValue;

        const value = String(p).trim();

        if (
            value === "" ||
            value === "null" ||
            value === "undefined" ||
            value === "[]" ||
            value === "{}"
        ) {
            return emptyValue;
        }
        return value;
    });
}
