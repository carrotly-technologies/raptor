import * as stream from 'stream';

export interface LoadGtfsArgs {
    stops: stream.Readable[];
    stopTimes: stream.Readable[];
    trips: stream.Readable[];
    calendars: stream.Readable[];
    calendarDates: stream.Readable[];
}

export interface LoadDatasetArgs {
    source: stream.Readable;
}

export interface SaveDatasetArgs {
    target: stream.Writable;
}

export interface BuildDatasetArgs {
    footpaths?: boolean;
    avgWalkingSpeed?: number;
    maxWalkingTime?: number;
}
