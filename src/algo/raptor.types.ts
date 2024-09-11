import {
    Calendar,
    CalendarDate,
    Route,
    RouteId,
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
    maxTransfers?: number;
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

export type RouteIndex = {
    routeId: RouteId;
    // --- temporary: start ---
    tripByTripId: Record<
        TripId,
        {
            service: {
                startDate: number;
                endDate: number;
                monday: boolean;
                tuesday: boolean;
                wednesday: boolean;
                thursday: boolean;
                friday: boolean;
                saturday: boolean;
                sunday: boolean;
                exclude: number[];
                include: number[];
            };
            stopTimeByStopId: Record<
                StopId,
                {
                    arrivalTime: RaptorTime;
                    departureTime: RaptorTime;
                }
            >;
        }
    >;
    // --- temporary: end ---
    trips: {
        tripId: TripId;
        service: {
            startDate: number;
            endDate: number;
            monday: boolean;
            tuesday: boolean;
            wednesday: boolean;
            thursday: boolean;
            friday: boolean;
            saturday: boolean;
            sunday: boolean;
            exclude: number[];
            include: number[];
        };
        stopTimes: {
            stopId: StopId;
            arrivalTime: RaptorTime;
            departureTime: RaptorTime;
        }[];
    }[];
    stops: {
        stopId: StopId;
        stopLat: number;
        stopLon: number;
    }[];
};

export type StopIndex = {
    stopId: StopId;
    routes: { routeId: RouteId }[];
};

export type ConnectionByStopId = Record<
    StopId,
    Record<
        number,
        {
            bestTripId?: TripId;
            sourceStopId: StopId;
            targetStopId: StopId;
            arrivalTime?: number;
            departureTime?: number;
        }
    >
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
