import crypto from "crypto";

export function generateRawToken() {
    return "leads_wizards_" + crypto.randomBytes(32).toString("hex");
}

export function hashToken(token: string) {
    return crypto.createHash("sha256").update(token).digest("hex");
}
