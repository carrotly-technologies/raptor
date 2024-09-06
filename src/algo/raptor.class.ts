import { calculateHaversineDistance } from '../utils/calculate-haversine-distance.function';
import { RouteId, Service, ServiceId, Stop, StopId, StopTime, TripId } from '../gtfs/gtfs.types';
import { numberToTime } from '../utils/number-to-time.function';
import { timeToNumber } from '../utils/time-to-number.function';
import { Journey, LoadArgs, PlanArgs, RouteIndex, StopIndex } from './raptor.types';
import { dateToNumber } from '../utils/date-to-number';

export class Raptor {
    private maxTransfers: number = 0;

    private routesIdx: Record<RouteId, RouteIndex> = {};
    private stopsIdx: Record<StopId, StopIndex> = {};

    // temporary mock for tests
    private footpaths: Record<StopId, Record<StopId, number>> = {};

    public load(args: LoadArgs): void {
        this.maxTransfers = args.maxTransfers;

        const stopTimes = [...args.stopTimes].sort((a, b) => Number(a['stop_sequence']) - Number(b['stop_sequence']));
        const stopTimesByTripId = stopTimes.reduce<Record<TripId, StopTime[]>>((acc, stopTime) => {
            const tripId = stopTime['trip_id'];

            acc[tripId] ??= [];
            acc[tripId].push(stopTime);

            return acc;
        }, {});

        const stopByStopId = args.stops.reduce<Record<StopId, Stop>>((acc, stop) => {
            acc[stop.stop_id] = stop;
            return acc;
        }, {});

        const calendarByServiceId = args.calendar.reduce<Record<ServiceId, Service>>((acc, calendar) => {
            acc[calendar.service_id] = calendar;
            return acc;
        }, {});

        const [includeDatesByServiceId, excludeDatesByServiceId] = args.calendarDates.reduce<Record<ServiceId, number[]>[]>((acc, calendarDate) => {
            const serviceId = calendarDate.service_id;

            if (calendarDate.exception_type === '1') {
                acc[0][serviceId] ??= [];
                acc[0][serviceId].push(Number(calendarDate.date));
            } else {
                acc[1][serviceId] ??= [];
                acc[1][serviceId].push(Number(calendarDate.date));
            }

            return acc;
        }, [{}, {}]);

        args.trips.forEach((trip) => {
            const stopTimes = stopTimesByTripId[trip['trip_id']] || [];
            if (stopTimes.length === 0) return;

            const stopIds = stopTimes.map((st) => st['stop_id']);
            const routeId = stopIds.join('-');

            this.routesIdx[routeId] ??= {
                routeId: trip['route_id'],
                trips: [],
                stops: [],
            };

            const calendar = calendarByServiceId[trip['service_id']];


            this.routesIdx[routeId].trips.push({
                tripId: trip['trip_id'],
                schedule: {
                    startDate: calendar ? dateToNumber(calendar.start_date) : 0,
                    endDate: calendar ? dateToNumber(calendar.end_date) : Number.MAX_SAFE_INTEGER,
                    monday: calendar?.monday === '1',
                    tuesday: calendar?.tuesday === '1',
                    wednesday: calendar?.wednesday === '1',
                    thursday: calendar?.thursday === '1',
                    friday: calendar?.friday === '1',
                    saturday: calendar?.saturday === '1',
                    sunday: calendar?.sunday === '1',
                    exclude: excludeDatesByServiceId[trip['service_id']] || [],
                    include: includeDatesByServiceId[trip['service_id']] || []
                },
                stopTimes: stopTimes.map((stopTime) => ({
                    stopId: stopTime['stop_id'],
                    arrivalTime: timeToNumber(stopTime['arrival_time']),
                    departureTime: timeToNumber(stopTime['departure_time']),
                })),
            });

            if (this.routesIdx[routeId].stops.length === 0) {
                this.routesIdx[routeId].stops = stopIds.map((stopId) => {
                    const stop = stopByStopId[stopId];

                    return {
                        stopId: stop['stop_id'],
                        stopLat: Number(stop['stop_lat']),
                        stopLon: Number(stop['stop_lon']),
                    };
                });
            }
        });

        Object.entries(this.routesIdx).forEach(([routeId, route]) => {
            route.stops.forEach(({ stopId }) => {
                this.stopsIdx[stopId] ??= { stopId, routes: [] };
                this.stopsIdx[stopId].routes.push({ routeId });
            });
        });

        const walkingSpeed = 1.33; // m/s
        const maxWalkingTime = 5 * 60;
        const maxWalkingDistance = maxWalkingTime * walkingSpeed;

        args.stops.forEach((sourceStop) => {
            this.footpaths[sourceStop['stop_id']] ??= {};

            args.stops.forEach((targetStop) => {
                if (sourceStop['stop_id'] === targetStop['stop_id']) return;

                const walkingDistance = calculateHaversineDistance(
                    Number(sourceStop['stop_lat']),
                    Number(sourceStop['stop_lon']),
                    Number(targetStop['stop_lat']),
                    Number(targetStop['stop_lon']),
                );

                if (walkingDistance > maxWalkingDistance) return;

                const walkingTime = Math.ceil(walkingDistance / walkingSpeed);
                this.footpaths[sourceStop['stop_id']][targetStop['stop_id']] = walkingTime;
            });
        });
    }

    public plan(args: PlanArgs): Journey[] {
        const sourceStopId = args.sourceStopId;
        const targetStopId = args.targetStopId;
        const departureTime = args.departureTime;

        // Intermediate results
        const results: Record<
            StopId,
            Record<
                number,
                {
                    bestTripId?: TripId;
                    sourceStopId: StopId;
                    targetStopId: StopId;
                    arrivalTime?: number;
                    departureTime?: number;
                    footpath?: any;
                }
            >
        > = {};

        // Initialization of the algorithm
        const knownArrivals: Array<Record<string, number>> = [];
        const bestArrivals: Record<string, number> = {};
        const markedStopIds: Set<string> = new Set();

        for (const stopId in this.stopsIdx) {
            for (let i = 0; i <= this.maxTransfers; i++) {
                knownArrivals[i] ??= {};
                knownArrivals[i][stopId] = Number.MAX_SAFE_INTEGER;
            }

            bestArrivals[stopId] = Number.MAX_SAFE_INTEGER;
        }

        knownArrivals[0][sourceStopId] = timeToNumber(departureTime);
        markedStopIds.add(sourceStopId);

        for (let k = 1; /* k < this.maxTransfers && */ markedStopIds.size > 0; k++) {
            // Accumulate routes serving marked stops from previous round
            const queue: Record<RouteId, StopId> = {};

            for (const markedStopId of markedStopIds) {
                const routes = this.stopsIdx[markedStopId].routes;

                for (const route of routes) {
                    const routeId = route.routeId;

                    queue[routeId] =
                        queue[routeId] && this.isStopBefore(routeId, queue[routeId], markedStopId)
                            ? queue[routeId]
                            : markedStopId;
                }

                markedStopIds.delete(markedStopId);
            }

            // Travers each route
            for (const routeId in queue) {
                let bestTripId: TripId | null = null;
                let boardingId: StopId | null = null;

                const route = this.routesIdx[routeId];
                const queueStopIdx = route.stops.findIndex((stop) => stop.stopId === queue[routeId]);

                const stops = route.stops.slice(queueStopIdx);

                for (const stop of stops) {
                    const stopId = stop.stopId;
                    const arrivalTime = this.getArrivalTime(routeId, bestTripId, stopId);

                    // Can the label be improved in this round?
                    // Includes local and target pruning
                    // I have no clue what "t != ⊥" means in this case, so I will ignore it for now
                    if (bestTripId && arrivalTime < Math.min(bestArrivals[stopId], bestArrivals[targetStopId])) {
                        const departureTime = this.getDepartureTime(routeId, bestTripId, boardingId);
                       
                        knownArrivals[k][stopId] = arrivalTime;
                        bestArrivals[stopId] = arrivalTime;
                        markedStopIds.add(stopId);

                        results[stopId] ??= {};
                        results[stopId][k] = {
                            bestTripId,
                            sourceStopId: boardingId,
                            targetStopId: stopId,
                            departureTime: departureTime,
                            arrivalTime: arrivalTime,
                        };
                    }

                    // Can we catch an earlier trip at this stop?
                    if (
                        !bestTripId ||
                        knownArrivals[k - 1][stop.stopId] <= this.getDepartureTime(routeId, bestTripId, stopId)
                    ) {
                        bestTripId = this.getEarliestTripId(routeId, stopId, knownArrivals[k - 1][stop.stopId]);
                        boardingId = stopId;
                    }
                }
            }

            // Look at footpaths
            for (const markedStopId of new Set(markedStopIds)) {
                for (const targetStopId in this.footpaths[markedStopId] || {}) {
                    const walkingTime = this.footpaths[markedStopId][targetStopId];
                    const arrivalTime = Math.min(
                        knownArrivals[k][targetStopId],
                        knownArrivals[k][markedStopId] + walkingTime,
                    );

                    if (arrivalTime < bestArrivals[targetStopId]) {
                        knownArrivals[k][targetStopId] = arrivalTime;
                        bestArrivals[targetStopId] = arrivalTime;

                        markedStopIds.add(targetStopId);

                        results[targetStopId] ??= {};
                        results[targetStopId][k] = {
                            sourceStopId: markedStopId,
                            targetStopId: targetStopId,
                            departureTime: arrivalTime - walkingTime,
                            arrivalTime: arrivalTime,
                        };
                    }
                }
            }
        }

        return this.transformToJourney(results, targetStopId);
    }

    // @todo: optimize search time by using index
    private isStopBefore(routeId: string, leftStopId: string, rightStopId: string): boolean {
        const route = this.routesIdx[routeId];

        const leftStopIdx = route.stops.findIndex((stop) => stop.stopId === leftStopId);
        const rightStopIdx = route.stops.findIndex((stop) => stop.stopId === rightStopId);

        return leftStopIdx < rightStopIdx;
    }

    // Returns arrival time of a trip at a stop
    // @todo: optimize search time by using index
    private getArrivalTime(routeId: string, tripId: string, stopId: string): number | null {
        const route = this.routesIdx[routeId];

        const trip = route.trips.find((trip) => trip.tripId === tripId);
        if (!trip) return null;

        const stopTime = trip.stopTimes.find((stopTime) => stopTime.stopId === stopId);
        if (!stopTime) return null;

        return stopTime.arrivalTime;
    }

    // Returns departure time of a trip at a stop
    // @todo: optimize search time by using index
    private getDepartureTime(routeId: string, tripId: string, stopId: string): number | null {
        const route = this.routesIdx[routeId];

        const trip = route.trips.find((trip) => trip.tripId === tripId);
        if (!trip) return null;

        const stopTime = trip.stopTimes.find((stopTime) => stopTime.stopId === stopId);
        if (!stopTime) return null;

        return stopTime.departureTime;
    }

    // Returns the earliest trip that stops at a stop after a minimum arrival time
    private getEarliestTripId(routeId: string, stopId: string, arrivalTime: number): TripId | null {
        const route = this.routesIdx[routeId];

        const stops = route.stops;
        const stopIdx = stops.findIndex((stop) => stop.stopId === stopId);

        const dateNumber = Number(new Date().toISOString().split('T')[0].replace(/-/g, ''));
        const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

        const trips = route.trips
            .filter((trip) => trip.schedule.include.includes(dateNumber) || (!trip.schedule.exclude.includes(dateNumber) && trip.schedule.startDate <= dateNumber && trip.schedule.endDate >= dateNumber && trip.schedule[dayName]))
            .filter((trip) => trip.stopTimes[stopIdx].arrivalTime >= arrivalTime)
        
        const trip = trips.reduce(
            (best, current) =>
                current.stopTimes[stopIdx].departureTime < best.stopTimes[stopIdx].departureTime ? current : best,
            trips[0],
        );

        if (!trip) return null;

        return trip.tripId;
    }

    // Transforms the intermediate results into a journey interface
    private transformToJourney(
        results: Record<
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
        >,
        targetStopId: StopId,
    ): Journey[] {
        const journeys: Journey[] = [];

        for (const k of Object.keys(results[targetStopId])) {
            const segments: Journey['segments'] = [];

            let currentStopId = targetStopId;
            for (let i = parseInt(k, 10); i > 0; i--) {
                const transit = results[currentStopId][i];

                segments.push({
                    tripId: transit.bestTripId,
                    sourceStopId: transit.sourceStopId,
                    targetStopId: transit.targetStopId,
                    departureTime: numberToTime(transit.departureTime),
                    arrivalTime: numberToTime(transit.arrivalTime),
                });

                currentStopId = transit.sourceStopId;

                if (!transit.bestTripId) {
                    const transit = results[currentStopId][i];

                    segments.push({
                        tripId: transit.bestTripId,
                        sourceStopId: transit.sourceStopId,
                        targetStopId: transit.targetStopId,
                        departureTime: numberToTime(transit.departureTime),
                        arrivalTime: numberToTime(transit.arrivalTime),
                    });

                    currentStopId = transit.sourceStopId;
                }
            }

            segments.reverse();
            journeys.push({ segments });
        }

        return journeys;
    }
}
