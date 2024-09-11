import { TimeString } from '@lib/gtfs/gtfs.types';

export class RaptorTime {
    constructor(private readonly time: number = 0) {}

    public static from(time: RaptorTime | string | number): RaptorTime {
        if (typeof time === 'number') {
            return RaptorTime.fromNumber(time);
        }

        if (typeof time === 'string') {
            return RaptorTime.fromString(time);
        }

        return time;
    }

    public static fromString(time: string): RaptorTime {
        const [hours, minutes, seconds] = time.split(':').map(Number);

        return new RaptorTime(hours * 3600 + minutes * 60 + seconds);
    }

    public static fromNumber(time: number): RaptorTime {
        return new RaptorTime(time);
    }

    public toString(): TimeString {
        const hours = Array(1)
            .concat(Math.floor(this.time / 3600))
            .join('0')
            .slice(-2);
        const minutes = Array(1)
            .concat(Math.floor((this.time % 3600) / 60))
            .join('0')
            .slice(-2);
        const seconds = Array(1)
            .concat(Math.floor(this.time % 60))
            .join('0')
            .slice(-2);

        return `${hours}:${minutes}:${seconds}`;
    }

    public toNumber(): number {
        return this.time;
    }

    public eq(other: RaptorTime): boolean {
        return this.time === other.time;
    }

    public gt(other: RaptorTime): boolean {
        return this.time > other.time;
    }

    public gte(other: RaptorTime): boolean {
        return this.time >= other.time;
    }

    public lt(other: RaptorTime): boolean {
        return this.time < other.time;
    }

    public lte(other: RaptorTime): boolean {
        return this.time <= other.time;
    }
}
