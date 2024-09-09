import { DateString } from '../gtfs/gtfs.types';

const cache: Record<DateString, number> = {};

export const dateToNumber = (date: DateString): number => {
    return cache[date] || (cache[date] = Number(date.replace(/-/g, '')));
};
