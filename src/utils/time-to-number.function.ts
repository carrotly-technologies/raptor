const cache: Record<string, number> = {};

export const timeToNumber = (time: string): number => {
    if (cache[time]) return cache[time];

    const [hours, minutes, seconds] = time.split(':').map(Number);
    cache[time] = hours * 3600 + minutes * 60 + seconds;

    return cache[time];
};
