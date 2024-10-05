export type StopId = string;
export type TripId = string;
export type RouteId = string;
export type ServiceId = string;

export type Agency = Record<string, string>;
export type Route = Record<string, string>;
export type Service = Record<string, string>;
export type Transfer = Record<string, string>;

export interface Stop {
    stop_id: string;
    stop_code: string;
    stop_name: string;
    stop_lat: number;
    stop_lon: number;
}

export interface StopTime {
    trip_id: string;
    stop_id: string;
    arrival_time: string;
    departure_time: string;
    stop_sequence: number;
}

export interface Trip {
    route_id: string;
    service_id: string;
    trip_id: string;
}

export interface Calendar {
    service_id: string;
    start_date: string;
    end_date: string;
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
    sunday: string;
}

export interface CalendarDate {
    service_id: string;
    date: string;
    exception_type: string;
}

export type DateString = `${string}-${string}-${string}`;
export type TimeString = `${string}:${string}:${string}`;

export interface GTFS {
    agency: Agency[];
    routes: Route[];
    stops: Stop[];
    trips: Trip[];
    stopTimes: StopTime[];
    transfers: Transfer[];
    calendar: Calendar[];
    calendarDates: CalendarDate[];
}
