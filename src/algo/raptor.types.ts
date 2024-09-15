import {
    Calendar,
    CalendarDate,
    Route,
    RouteId,
    ServiceId,
    Stop,
    StopId,
    StopTime,
    Transfer,
    Trip,
    TripId,
} from '@lib/gtfs/gtfs.types';
import { RaptorDate } from '@lib/utils/raptor-date.class';
import { RaptorTime } from '@lib/utils/raptor-time.class';

export interface LoadArgs {
    stops: Stop[];
    trips: Trip[];
    routes: Route[];
    stopTimes: StopTime[];
    calendar: Calendar[];
    calendarDates: CalendarDate[];
    transfers: Transfer[];
    maxRounds?: number;
    maxDays?: number;
    maxWalkingTime?: number;
    walkingSpeed?: number;
}

export interface RangeArgs {
    sourceStopId: StopId;
    targetStopId: StopId;
    date: RaptorDate | string | number;
}

export interface PlanArgs {
    sourceStopId: StopId;
    targetStopId: StopId;
    date: RaptorDate | string | number;
    time: RaptorTime | string | number;
}

type RouteIdx = number;
type StopIdx = number;
type StopTimeIdx = number;
type TransferIdx = number;
type RouteStopIdx = number;
type StopRouteIdx = number;
type RouteIdxToStopIdx = Array<number>;

export interface Route_1 {
    routeId: RouteId;
    numberOfTrips: number;
    numberOfServices: number;
    numberOfRouteStops: number;
    firstTripIdx: number;
    firstServiceIdx: number;
    firstRouteStopIdx: number;
}

export interface StopTime_1 {
    tripId: TripId;
    stopId: StopId;
    arrivalTime: number;
    departureTime: number;
}

export type RouteStop_1 = number;

export interface Stop_1 {
    stopId: StopId;
    numberOfStopRoutes: number;
    numberOfTransfers: number;
    firstStopRouteIdx: number;
    firstTransferIdx: number;
}

export interface Transfer_1 {
    targetStopId: StopId;
    walkingTime: number;
}

export type StopRoute_1 = number;

interface Service_1 {
    serviceId: ServiceId;
    startDate: number;
    endDate: number;
    dayOfWeek: Array<boolean>;
    exclude: Array<boolean>;
    include: Array<boolean>;
}

export type ConnectionsByStopIdx = Array<
    Array<{
        tripId?: TripId;
        sourceStopIdx: StopIdx;
        targetStopIdx: StopIdx;
        departureTime: number;
        arrivalTime: number;
    }>
>;

export interface Journey {
    segments: {
        tripId?: TripId;
        sourceStopId: StopId;
        targetStopId: StopId;
        arrivalTime: number;
        departureTime: number;
    }[];
    departureTime: number;
    arrivalTime: number;
}
