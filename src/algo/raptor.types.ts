import * as gtfs from '@lib/gtfs/gtfs.types';
import { RaptorDate } from '@lib/utils/raptor-date.class';
import { RaptorTime } from '@lib/utils/raptor-time.class';

export interface ConstructorArgs {
    maxRounds?: number;
    maxDays?: number;
    maxWalkingTime?: number;
    avgWalkingSpeed?: number;
    footpaths?: 'computed' | 'transfers' | 'none';
}

export interface LoadArgs {
    // url: string | string[];
    stops: gtfs.Stop[];
    trips: gtfs.Trip[];
    routes: gtfs.Route[];
    stopTimes: gtfs.StopTime[];
    calendar: gtfs.Calendar[];
    calendarDates: gtfs.CalendarDate[];
    transfers: gtfs.Transfer[];
}

export interface DumpArgs {
    url: string;
}

export interface RangeArgs {
    sourceStopId: gtfs.StopId;
    targetStopId: gtfs.StopId;
    date: RaptorDate | string | number;
}

export interface PlanArgs {
    sourceStopId: gtfs.StopId;
    targetStopId: gtfs.StopId;
    date: RaptorDate | string | number;
    time: RaptorTime | string | number;
}

export type RouteIdx = number;
export type StopIdx = number;
export type StopTimeIdx = number;
export type TransferIdx = number;
export type RouteStopIdx = number;
export type StopRouteIdx = number;
export type RouteIdxToStopIdx = Array<number>;

export interface Route {
    routeId: gtfs.RouteId;
    numberOfTrips: number;
    numberOfServices: number;
    numberOfRouteStops: number;
    firstTripIdx: number;
    firstServiceIdx: number;
    firstRouteStopIdx: number;
}

export interface StopTime {
    tripId: gtfs.TripId;
    stopId: gtfs.StopId;
    arrivalTime: number;
    departureTime: number;
}

export type RouteStop = number;

export interface Stop {
    stopId: gtfs.StopId;
    numberOfStopRoutes: number;
    numberOfTransfers: number;
    firstStopRouteIdx: number;
    firstTransferIdx: number;
}

export interface Transfer {
    targetStopId: gtfs.StopId;
    walkingTime: number;
}

export type StopRoute = number;

export interface Service {
    serviceId: gtfs.ServiceId;
    startDate: number;
    endDate: number;
    // What would be the performance impact of using a Map/Set instead of an Array?
    dayOfWeek: Array<boolean>;
    exclude: Array<boolean>;
    include: Array<boolean>;
}

export type ConnectionsByStopIdx = Array<
    Array<{
        tripId?: gtfs.TripId;
        sourceStopIdx: StopIdx;
        targetStopIdx: StopIdx;
        departureTime: number;
        arrivalTime: number;
    }>
>;

export interface Journey {
    segments: {
        tripId?: gtfs.TripId;
        sourceStopId: gtfs.StopId;
        targetStopId: gtfs.StopId;
        arrivalTime: number;
        departureTime: number;
    }[];
    departureTime: number;
    arrivalTime: number;
}
