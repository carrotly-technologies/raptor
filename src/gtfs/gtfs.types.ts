export type StopId = string;
export type TripId = string;
export type RouteId = string;
export type ServiceId = string;

export type Agency = Record<string, string>;
export type Stop = Record<string, string>;
export type Calendar = Record<string, string>;
export type CalendarDate = Record<string, string>;
export type Trip = Record<string, string>;
export type Route = Record<string, string>;
export type Service = Record<string, string>;
export type Transfer = Record<string, string>;
export type StopTime = Record<string, string>;

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
