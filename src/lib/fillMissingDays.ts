export function fillMissingDays(
  start: Date,
  end: Date,
  data: { date: string; count: number }[]
) {
  const map = new Map(data.map(d => [d.date, d.count]));
  const result: { date: string; count: number }[] = [];

  const cursor = new Date(start);

  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);

    result.push({
      date: key,
      count: map.get(key) ?? 0,
    });

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return result;
}
