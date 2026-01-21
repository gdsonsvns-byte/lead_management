import { AccountSummaryResponse, ManagerResponse, NormalizedAccount } from "../types/auth";

export function normalizeAccountResponse(
    apiData: AccountSummaryResponse | ManagerResponse): NormalizedAccount {
    if ("user" in apiData) {
        return {
            account: apiData.account,
            users: [apiData.user],
            initials: apiData.initials,
        };
    }

    return {
        account: apiData.data,
        users: apiData.data.users,
        forms: apiData.data.forms,
        counts: apiData.data._count,
        initials: apiData.initials,
        total_response: apiData.total_response,
    };
}
