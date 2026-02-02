export function getDateRange(range: string) {
    const now = new Date();

    const utcToday = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate()
    ));

    const utcEndOfToday = new Date(utcToday);
    utcEndOfToday.setUTCHours(23, 59, 59, 999);

    const daysAgo = (days: number) => {
        const d = new Date(utcToday);
        d.setUTCDate(d.getUTCDate() - days);
        d.setUTCHours(0, 0, 0, 0);
        return d;
    };

    if (range === "last_7_days") {
        return { start: daysAgo(6), end: utcEndOfToday };
    }

    if (range === "last_30_days") {
        return { start: daysAgo(29), end: utcEndOfToday };
    }

    if (range === "last_90_days") {
        return { start: daysAgo(89), end: utcEndOfToday };
    }

    if (range.startsWith("custom_date=")) {
        const value = range.replace("custom_date=", "");
        const [startStr, endStr] = value.split(",");

        const [sy, sm, sd] = startStr.split("-").map(Number);
        const [ey, em, ed] = endStr.split("-").map(Number);

        return {
            start: new Date(Date.UTC(sy, sm - 1, sd, 0, 0, 0, 0)),
            end: new Date(Date.UTC(ey, em - 1, ed, 23, 59, 59, 999)),
        };
    }

    return { start: utcToday, end: utcEndOfToday };
}
