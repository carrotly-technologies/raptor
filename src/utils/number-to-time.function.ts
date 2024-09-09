import { TimeString } from '../gtfs/gtfs.types';

const cache: Record<number, TimeString> = {};

export const numberToTime = (num: number): TimeString => {
    if (cache[num]) return cache[num];

    const hours = Array(1)
        .concat(Math.floor(num / 3600))
        .join('0')
        .slice(-2);
    const minutes = Array(1)
        .concat(Math.floor((num % 3600) / 60))
        .join('0')
        .slice(-2);
    const seconds = Array(1)
        .concat(Math.floor(num % 60))
        .join('0')
        .slice(-2);

    return (cache[num] = `${hours}:${minutes}:${seconds}`);
};
