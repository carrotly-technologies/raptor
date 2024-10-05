import {
    ConnectionsByStopIdx,
    ConstructorArgs,
    Footpath,
    Journey,
    PlanArgs,
    RangeArgs,
    Route,
    RouteIdxToStopIdx,
    RouteStop,
    Service,
    Stop,
    StopIdx,
    StopRoute,
    StopTime,
} from '@lib/algo/raptor.types';
import { RaptorDate } from '@lib/utils/raptor-date.class';
import { RaptorTime } from '@lib/utils/raptor-time.class';
import { raptor } from './raptor-collector.class';

export class Raptor {
    private maxRounds: number;
    private maxDays: number;

    private routes: Route[] = [];
    private stopTimes: StopTime[] = [];

    private stops: Stop[] = [];
    private footpaths: Footpath[] = [];

    private routeStops: RouteStop[] = [];
    private stopRoutes: StopRoute[] = [];

    private services: Service[] = [];

    private stopIdxByStopId: Map<string, number> = new Map();

    public constructor(args: Pick<ConstructorArgs, 'maxRounds' | 'maxDays'> & { dataset: raptor.Dataset }) {
        this.maxRounds = args.maxRounds ?? 10;
        this.maxDays = args.maxDays ?? 1;
        this.routes = args.dataset.routes;
        this.stopTimes = args.dataset.stopTimes;
        this.stops = args.dataset.stops;
        this.footpaths = args.dataset.footpaths;
        this.routeStops = args.dataset.routeStops;
        this.stopRoutes = args.dataset.stopRoutes;
        this.services = args.dataset.services;
        this.stopIdxByStopId = new Map(args.dataset.stops.map((stop, idx) => [stop.stopId, idx]));
    }

    public range(args: RangeArgs): Journey[] {
        const journeys: Journey[] = [];

        const sourceStopId = args.sourceStopId;
        const targetStopId = args.targetStopId;
        const date = RaptorDate.from(args.date);

        const maxTime = RaptorTime.from('24:00:00');
        let time = RaptorTime.from('00:00:00');

        while (time.lt(maxTime)) {
            const candidats1 = this.plan({ sourceStopId, targetStopId, date, time });
            const candidats2 = candidats1.filter((journey) => journey.departureTime <= maxTime.toNumber());

            if (candidats2.length === 0) break;

            journeys.push(...candidats2);
            time = RaptorTime.fromNumber(
                candidats2.reduce((acc, journey) => Math.min(acc, journey.departureTime), Number.MAX_SAFE_INTEGER) + 1,
            );
        }

        const dominated: number[] = [];

        for (let i = 0; i < journeys.length; i++) {
            for (let j = 0; j < journeys.length; j++) {
                if (j === i) {
                    continue;
                }

                if (
                    journeys[i].departureTime >= journeys[j].departureTime &&
                    journeys[i].arrivalTime <= journeys[j].arrivalTime
                ) {
                    dominated[j] ??= 0;
                    dominated[j]++;
                }
            }
        }

        return journeys.filter((_, i) => !dominated[i] || dominated[i] === 0);
    }

    public plan(args: PlanArgs): Journey[] {
        const sourceStopId = args.sourceStopId;
        const targetStopId = args.targetStopId;
        const date = RaptorDate.from(args.date);
        const time = RaptorTime.from(args.time);

        const sourceStopIdx = this.stopIdxByStopId.get(sourceStopId);
        const targetStopIdx = this.stopIdxByStopId.get(targetStopId);

        // Intermediate results
        const connectionsByStopIdx: ConnectionsByStopIdx = [];

        // Initialization of the algorithm
        const knownArrivals = Array.from({ length: this.maxRounds + 1 }, () =>
            new Array(this.stops.length).fill(Number.MAX_SAFE_INTEGER),
        );
        const bestArrivals = Array.from({ length: this.stops.length }, () => Number.MAX_SAFE_INTEGER);
        const markedStopIdxs: Set<number> = new Set([sourceStopIdx]);

        knownArrivals[0][sourceStopIdx] = time.toNumber();

        for (let round = 1; round <= this.maxRounds && markedStopIdxs.size > 0; round++) {
            // Accumulate routes serving marked stops from previous round
            const queue: RouteIdxToStopIdx = [];

            markedStopIdxs.forEach((markedStopIdx) => {
                const stop = this.stops[markedStopIdx];

                for (
                    let stopRouteIdx = stop.firstStopRouteIdx;
                    stopRouteIdx < stop.firstStopRouteIdx + stop.numberOfStopRoutes;
                    stopRouteIdx++
                ) {
                    const routeIdx = this.stopRoutes[stopRouteIdx];

                    if (queue[routeIdx] !== undefined) {
                        if (this.isStopBefore(routeIdx, markedStopIdx, queue[routeIdx])) {
                            queue[routeIdx] = markedStopIdx;
                        }
                    } else {
                        queue[routeIdx] = markedStopIdx;
                    }
                }

                markedStopIdxs.delete(markedStopIdx);
            });

            // Travers each route
            queue.forEach((earliestMarkedStopIdx, routeIdx) => {
                let boardingTripIdx: number | null = null;
                let boardingRouteStopIdx: number | null = null;
                let timeShift = 0;

                const route = this.routes[routeIdx];

                let skipFirstNthStops = 0;

                for (let i = 0; i < route.numberOfRouteStops; i++) {
                    if (this.routeStops[route.firstRouteStopIdx + i] === earliestMarkedStopIdx) {
                        skipFirstNthStops = i;
                        break;
                    }
                }

                for (
                    let routeStopIdx = route.firstRouteStopIdx + skipFirstNthStops;
                    routeStopIdx < route.firstRouteStopIdx + route.numberOfRouteStops;
                    routeStopIdx++
                ) {
                    const arrivalTime =
                        this.stopTimes[boardingTripIdx + routeStopIdx - route.firstRouteStopIdx].arrivalTime +
                        timeShift;
                    const stopIdx = this.routeStops[routeStopIdx];

                    if (
                        boardingTripIdx !== null &&
                        arrivalTime < Math.min(bestArrivals[stopIdx], bestArrivals[targetStopIdx])
                    ) {
                        const departureTime =
                            this.stopTimes[boardingTripIdx + boardingRouteStopIdx - route.firstRouteStopIdx]
                                .departureTime + timeShift;
                        const boardingStopIdx = this.routeStops[boardingRouteStopIdx];
                        const tripId = this.stopTimes[boardingTripIdx].tripId;

                        knownArrivals[round][stopIdx] = arrivalTime;
                        bestArrivals[stopIdx] = arrivalTime;

                        markedStopIdxs.add(stopIdx);

                        connectionsByStopIdx[stopIdx] ??= [];
                        connectionsByStopIdx[stopIdx][round] = {
                            tripId: tripId,
                            sourceStopIdx: boardingStopIdx,
                            targetStopIdx: stopIdx,
                            departureTime,
                            arrivalTime,
                        };
                    }

                    const departureTime =
                        this.stopTimes[boardingTripIdx + routeStopIdx - route.firstRouteStopIdx].departureTime +
                        timeShift;

                    if (boardingTripIdx === null || knownArrivals[round - 1][stopIdx] <= departureTime) {
                        [boardingTripIdx, timeShift] = this.getEarliestBoardingStopTimeIdx(
                            routeIdx,
                            routeStopIdx,
                            date.toNumber(),
                            date.getDayOfWeek(),
                            knownArrivals[round - 1][stopIdx],
                        );
                        boardingRouteStopIdx = routeStopIdx;
                    }
                }
            });

            // Look at footpaths
            new Set(markedStopIdxs).forEach((markedStopIdx) => {
                const stop = this.stops[markedStopIdx];

                for (
                    let transferIdx = stop.firstTransferIdx;
                    transferIdx < stop.firstTransferIdx + stop.numberOfTransfers;
                    transferIdx++
                ) {
                    const { targetStopId, walkingTime } = this.footpaths[transferIdx];
                    const targetStopIdx = this.stopIdxByStopId.get(targetStopId);

                    const arrivalTime = Math.min(
                        knownArrivals[round][targetStopIdx],
                        knownArrivals[round][markedStopIdx] + walkingTime,
                    );

                    if (arrivalTime < bestArrivals[targetStopIdx]) {
                        knownArrivals[round][targetStopIdx] = arrivalTime;
                        bestArrivals[targetStopIdx] = arrivalTime;

                        connectionsByStopIdx[targetStopIdx] ??= [];
                        connectionsByStopIdx[targetStopIdx][round] = {
                            sourceStopIdx: markedStopIdx,
                            targetStopIdx: targetStopIdx,
                            departureTime: arrivalTime - walkingTime,
                            arrivalTime: arrivalTime,
                        };

                        markedStopIdxs.add(targetStopIdx);
                    }
                }
            });
        }

        return this.reconstructJourneys(connectionsByStopIdx, targetStopIdx);
    }

    private isStopBefore(routeIdx: number, leftStopIdx: number, rightStopIdx: number): boolean {
        const route = this.routes[routeIdx];

        for (
            let routeStopIdx = route.firstRouteStopIdx;
            routeStopIdx < route.firstRouteStopIdx + route.numberOfRouteStops;
            routeStopIdx++
        ) {
            if (this.routeStops[routeStopIdx] === leftStopIdx) {
                return true;
            }

            if (this.routeStops[routeStopIdx] === rightStopIdx) {
                return false;
            }
        }

        return false;
    }

    private getEarliestBoardingStopTimeIdx(
        routeIdx: number,
        routeStopIdx: number,
        date: number,
        dayOfWeek: number,
        time: number,
        retry = this.maxDays,
    ): [number, number] {
        const route = this.routes[routeIdx];

        for (
            let stopTimeIdx = route.firstTripIdx + routeStopIdx - route.firstRouteStopIdx,
                serviceIdx = route.firstServiceIdx;
            stopTimeIdx < route.firstTripIdx + route.numberOfTrips * route.numberOfRouteStops;
            stopTimeIdx += route.numberOfRouteStops, serviceIdx += 1
        ) {
            const service = this.services[serviceIdx];

            if (
                service.include.get(date) === true ||
                (service.exclude.get(date) !== true &&
                    service.startDate <= date &&
                    date <= service.endDate &&
                    service.dayOfWeek[dayOfWeek])
            ) {
                if (this.stopTimes[stopTimeIdx].arrivalTime >= time) {
                    return [stopTimeIdx - routeStopIdx + route.firstRouteStopIdx, 86400 * (this.maxDays - retry)];
                }
            }
        }
        // @fixme: date + 1 is not correct, it will not work for the last day of the month
        return retry > 0
            ? this.getEarliestBoardingStopTimeIdx(
                  routeIdx,
                  routeStopIdx,
                  date + 1,
                  (dayOfWeek + 1) % 7,
                  Math.max(0, time - 86400),
                  retry - 1,
              )
            : [null, 0];
    }

    private reconstructJourneys(connectionsByStopIdx: ConnectionsByStopIdx, targetStopIdx: StopIdx): Journey[] {
        const journeys: Journey[] = [];

        (connectionsByStopIdx[targetStopIdx] || []).forEach((_, round) => {
            const segments: Journey['segments'] = [];

            let currentStopIdx = targetStopIdx;
            for (let i = round; i > 0; i--) {
                const connection = connectionsByStopIdx[currentStopIdx][i];

                segments.unshift({
                    tripId: connection.tripId,
                    sourceStopId: this.stops[connection.sourceStopIdx].stopId,
                    targetStopId: this.stops[connection.targetStopIdx].stopId,
                    departureTime: connection.departureTime,
                    arrivalTime: connection.arrivalTime,
                });

                currentStopIdx = connection.sourceStopIdx;

                if (!connection.tripId) {
                    const connection = connectionsByStopIdx[currentStopIdx][i];

                    segments.unshift({
                        tripId: connection.tripId,
                        sourceStopId: this.stops[connection.sourceStopIdx].stopId,
                        targetStopId: this.stops[connection.targetStopIdx].stopId,
                        departureTime: connection.departureTime,
                        arrivalTime: connection.arrivalTime,
                    });

                    currentStopIdx = connection.sourceStopIdx;
                }
            }

            const departureTime = segments[0].departureTime;
            const arrivalTime = segments[segments.length - 1].arrivalTime;

            journeys.push({ departureTime, arrivalTime, segments });
        });

        return journeys;
    }
}
