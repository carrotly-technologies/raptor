import * as gtfs from '../gtfs/gtfs.types';
import { RaptorDate } from '../utils/raptor-date.class';
import { RaptorTime } from '../utils/raptor-time.class';

export interface ConstructorArgs {
    maxRounds?: number;
    maxDays?: number;
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

export interface Footpath {
    targetStopId: gtfs.StopId;
    walkingTime: number;
}

export type StopRoute = number;

export interface Service {
    serviceId: gtfs.ServiceId;
    startDate: number;
    endDate: number;
    dayOfWeek: Array<boolean>;
    exclude: Map<number, boolean>;
    include: Map<number, boolean>;
}

export interface Dataset {
    routes: Route[];
    stopTimes: StopTime[];
    stops: Stop[];
    footpaths: Footpath[];
    routeStops: RouteStop[];
    stopRoutes: StopRoute[];
    services: Service[];
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
