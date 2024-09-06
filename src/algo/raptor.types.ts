import {
    Calendar,
    CalendarDate,
    Route,
    RouteId,
    Stop,
    StopId,
    StopTime,
    Time,
    Transfer,
    Trip,
    TripId,
} from '../gtfs/gtfs.types';

export interface LoadArgs {
    stops: Stop[];
    trips: Trip[];
    routes: Route[];
    stopTimes: StopTime[];
    calendar: Calendar[];
    calendarDates: CalendarDate[];
    transfers: Transfer[];
    maxTransfers?: number;
}

export interface PlanArgs {
    sourceStopId: StopId;
    targetStopId: StopId;
    departureTime: Time;
}

export type RouteIndex = {
    routeId: RouteId;
    trips: {
        tripId: TripId;
        schedule: {
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
        }
        stopTimes: {
            stopId: StopId;
            arrivalTime: number;
            departureTime: number;
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
    routes: {
        routeId: RouteId;
    }[];
};

export interface Journey {
    segments: {
        tripId?: TripId;
        sourceStopId: StopId;
        targetStopId: StopId;
        arrivalTime?: Time;
        departureTime?: Time;
    }[];
}
