import { DateString } from '@lib/gtfs/gtfs.types';

export class RaptorDate {
    constructor(private readonly date: number = 0) {}

    public static from(date: RaptorDate | string | number): RaptorDate {
        if (typeof date === 'number') {
            return RaptorDate.fromNumber(date);
        }

        if (typeof date === 'string') {
            return RaptorDate.fromString(date);
        }

        return date;
    }

    public static fromString(date: string): RaptorDate {
        return new RaptorDate(Number(date.replace(/-/g, '')));
    }

    public static fromNumber(date: number): RaptorDate {
        return new RaptorDate(date);
    }

    public toString(): DateString {
        const date = this.date.toString();

        return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
    }

    public toNumber(): number {
        return this.date;
    }

    public getDayOfWeek(): string {
        return new Date(this.toString()).toLocaleDateString('en-US', { weekday: 'long' }).toLocaleLowerCase();
    }
}
