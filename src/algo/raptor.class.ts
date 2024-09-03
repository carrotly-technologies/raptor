import { RouteId, Stop, StopId, StopTime, TripId } from '../gtfs/gtfs.types';
import { timeToSeconds } from '../utils/time-to-seconds.function';
import { Journey, LoadArgs, PlanArgs, RouteIndex, StopIndex } from './raptor.types';
import { secondsToTime } from '../utils/seconds-to-time.function';

export class Raptor {
    private maxTransfers: number = 0;

    private routesIdx: Record<RouteId, RouteIndex> = {};
    private stopsIdx: Record<StopId, StopIndex> = {};

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

            stopIds.forEach((stopId) => {
                this.stopsIdx[stopId] ??= {
                    stopId,
                    routes: [],
                    transfers: [],
                };

                this.stopsIdx[stopId].routes.push({ routeId });
            });
        });
    }

    public plan(args: PlanArgs): Journey {
        const sourceStopId = args.sourceStopId;
        const targetStopId = args.targetStopId;
        const departureTime = args.departureTime;

        // Intermediate results
        const results: Record<StopId, Record<number, { bestTripId: TripId, sourceStopId: StopId, targetStopId: StopId, arrivalTime: number, departureTime: number }>> = {};

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

        for (let k = 1; k < this.maxTransfers && markedStopIds.size > 0; k++) {
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

            for (const routeId in queue) {
                let bestTripId: TripId | null = null;
                let boardingId: StopId | null = null;

                const route = this.routesIdx[routeId];
                const queueStopIdx = route.stops.findIndex((stop) => stop.stopId === queue[routeId]);

                const stops = route.stops.slice(queueStopIdx);
                for (const stop of stops) {
                    const stopId = stop.stopId;

                    // Can the label be improved in this round?
                    // Includes local and target pruning
                    // I have no clue what "t != ⊥" means in this case, so I will ignore it for now
                    if (bestTripId && this.getArrivalTime(routeId, bestTripId, stopId) < Math.min(bestArrivals[stopId], bestArrivals[targetStopId])) {
                        knownArrivals[k][stopId] = this.getArrivalTime(routeId, bestTripId, stopId);
                        bestArrivals[stopId] = this.getArrivalTime(routeId, bestTripId, stopId);
                        markedStopIds.add(stopId);

                        results[stopId] ??= {};
                        results[stopId][k] = { 
                            bestTripId, 
                            sourceStopId: boardingId, 
                            targetStopId: stopId,
                            departureTime: this.getDepartureTime(routeId, bestTripId, boardingId), 
                            arrivalTime: this.getArrivalTime(routeId, bestTripId, stopId),
                        };
                    }

                    // Can we catch an earlier trip at this stop?
                    else if (!bestTripId || knownArrivals[k-1][stop.stopId] <= this.getDepartureTime(routeId, bestTripId, stopId)) {
                        bestTripId = this.getEarliestTripId(routeId, stopId, knownArrivals[k-1][stop.stopId]);
                        boardingId = stopId;
                    }  
                }
            }

            // ignore footpaths for now
        }

        return this.transformToJourney(results, targetStopId);
    }

    private isStopBefore(routeId: string, leftStopId: string, rightStopId: string): boolean {
        const route = this.routesIdx[routeId];

        // Eventually, we should have index for this to avoid O(n) search
        const leftStopIdx = route.stops.findIndex((stop) => stop.stopId === leftStopId);
        const rightStopIdx = route.stops.findIndex((stop) => stop.stopId === rightStopId);

        return leftStopIdx < rightStopIdx;
    }

    // Returns arrival time of a trip at a stop
    private getArrivalTime(routeId: string, tripId: string, stopId: string): number | null {
        const route = this.routesIdx[routeId];

        const trip = route.trips.find((trip) => trip.tripId === tripId);
        if (!trip) return null;

        const stopTime = trip.stopTimes.find((stopTime) => stopTime.stopId === stopId);
        if (!stopTime) return null;

        return stopTime.arrivalTime;
    }

    // Returns departure time of a trip at a stop
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

        const trip = route.trips.find((trip) => trip.stopTimes[stopIdx].arrivalTime >= arrivalTime);
        if (!trip) return null;

        return trip.tripId;
    }

    // Transforms the intermediate results into a journey interface
    private transformToJourney(results: Record<StopId, Record<number, { bestTripId: TripId, sourceStopId: StopId, targetStopId: StopId, arrivalTime: number, departureTime: number }>>, targetStopId: StopId): Journey {
        const journey: Journey = { segments: [] };

        let currentStopId = targetStopId;

        while (true) {
            const targetResults = results[currentStopId];
            if (!targetResults) break;
            
            const minTransfers = Math.min(...Object.keys(targetResults).map((t) => Number(t)));
            const targetResult = targetResults[minTransfers];

            journey.segments.push({
                tripId: targetResult.bestTripId,
                sourceStopId: targetResult.sourceStopId,
                targetStopId: targetResult.targetStopId,
                departureTime: secondsToTime(targetResult.departureTime),
                arrivalTime: secondsToTime(targetResult.arrivalTime),
            });

            currentStopId = targetResult.sourceStopId;
        }

        journey.segments.reverse();

        return journey;
    }
}
