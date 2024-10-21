import * as stream from 'stream';
import * as gtfs from '../gtfs/gtfs.types';

export interface LoadGtfsArgs {
    stops: gtfs.Stop[];
    stopTimes: gtfs.StopTime[];
    trips: gtfs.Trip[];
    calendars: gtfs.Calendar[];
    calendarDates: gtfs.CalendarDate[];
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
