import { RouteId, Stop, StopId, StopTime, TripId } from '../gtfs/gtfs.types';
import { secondsToTime } from '../utils/seconds-to-time.function';
import { timeToSeconds } from '../utils/time-to-seconds.function';
import { Journey, LoadArgs, PlanArgs, RouteIndex, StopIndex } from './raptor.types';

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

            this.routesIdx[routeId].trips.push({
                tripId: trip['trip_id'],
                stopTimes: stopTimes.map((stopTime) => ({
                    stopId: stopTime['stop_id'],
                    arrivalTime: timeToSeconds(stopTime['arrival_time']),
                    departureTime: timeToSeconds(stopTime['departure_time']),
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

        // const stopIdsByParentStopId: Record<StopId, StopId[]> = args.stops.filter((stop) => stop['parent_station'] !== '').reduce<Record<StopId, StopId[]>>((acc, stop) => {
        //     const childStopId = stop['stop_id'];
        //     const parentStopId = stop['parent_station']

        //     acc[parentStopId] ??= [];
        //     acc[parentStopId].push(childStopId)

        //     return acc;
        // }, {})

        // const transfersByStopId: Record<StopId, StopId[]> = args.stops.reduce<Record<StopId, StopId[]>>((acc, stop) => {
        //     const stopId = stop['stop_id'];
        //     const parentId = stop['parent_station'];

        //     acc[stopId] ??= parentId === ''
        //         ? stopIdsByParentStopId[stopId] || []
        //         : [parentId, ...stopIdsByParentStopId[parentId].filter((a) => a !== stopId)];

        //     return acc;
        // }, {})

        Object.entries(this.routesIdx).forEach(([routeId, route]) => {
            route.stops.forEach(({ stopId }) => {
                this.stopsIdx[stopId] ??= { stopId, routes: [], transfers: [] };
                this.stopsIdx[stopId].routes.push({ routeId });
            });
        });

        // Kraków Rondo Grunwaldzkie:
        // - 959789 (PARENT)
        // - 1014871 (END)
        // - 1014872
        // - 1536334 (START)

        this.footpaths['1014871'] = { ['1536334']: timeToSeconds('00:05:00') };
        this.footpaths['1536334'] = { ['1014871']: timeToSeconds('00:05:00') };
        this.footpaths['80630'] = { ['1450499']: timeToSeconds('00:05:00') };
        this.footpaths['1450499'] = { ['80630']: timeToSeconds('00:05:00') };
        this.footpaths['80416'] = { ['824492']: timeToSeconds('00:05:00') };
        this.footpaths['824492'] = { ['80416']: timeToSeconds('00:05:00') };
    }

    private buildRoutesIdx(): Record<RouteId, RouteIndex> {
        return {};
    }

    private buildStopsIdx(): Record<StopId, StopIndex> {
        return {};
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

        knownArrivals[0][sourceStopId] = timeToSeconds(departureTime);
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
                        if (arrivalTime < departureTime) {
                            // @fixme!
                            // This is some temporary workaround because for some reason the actual
                            // implementation sometimes returns arrivalTime < departureTime
                            //
                            // Example, from 1014894 to 1450499 after 11:45:00:
                            // 17:15 - 19:12 bus A21 Nowy Sącz MDA, Koleje Małopolskie, Nowy Targ D.A. → Nowy Sącz MDA
                            // 20:05 - 21:52 bus A22 Tarnów Dworzec Autobusowy, Koleje Małopolskie, Nowy Sącz MDA → Tarnów ul. Krakowska - Przemysłowa
                            // **22:10 - 21:30** bus A29 Tarnów Marszałka, Koleje Małopolskie, Tarnów ul. Krakowska - Przemysłowa → Tarnów Marszałka
                            // 21:30 - 21:37 bus A29 Tarnów Marszałka, Koleje Małopolskie, Tarnów Marszałka → Tarnów Sikorskiego
                            // 21:37 - 21:39 bus A39 Tarnów Dworzec Autobusowy, Koleje Małopolskie, Tarnów Sikorskiego → Tarnów Dworzec Autobusowy

                            continue;
                        }

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

        const trips = route.trips.filter((trip) => trip.stopTimes[stopIdx].arrivalTime >= arrivalTime);
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
                    departureTime: secondsToTime(transit.departureTime),
                    arrivalTime: secondsToTime(transit.arrivalTime),
                });

                currentStopId = transit.sourceStopId;

                if (!transit.bestTripId) {
                    const transit = results[currentStopId][i];

                    segments.push({
                        tripId: transit.bestTripId,
                        sourceStopId: transit.sourceStopId,
                        targetStopId: transit.targetStopId,
                        departureTime: secondsToTime(transit.departureTime),
                        arrivalTime: secondsToTime(transit.arrivalTime),
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
