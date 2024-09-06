const cache: Record<string, number> = {};

export const dateToNumber = (date: string): number => {
    return cache[date] || (cache[date] = Number(date));
}