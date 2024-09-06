import { Time } from '../gtfs/gtfs.types';

const cache: Record<number, Time> = {};

export const numberToTime = (num: number): Time => {
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
    cache[num] = `${hours}:${minutes}:${seconds}`;

    return cache[num];
};
