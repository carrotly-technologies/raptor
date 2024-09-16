import {
    ConnectionsByStopIdx,
    Journey,
    LoadArgs,
    PlanArgs,
    RangeArgs,
    Route,
    RouteIdx,
    RouteIdxToStopIdx,
    RouteStop,
    Service,
    Stop_1,
    StopIdx,
    StopRoute,
    StopTime_1,
    Transfer,
} from '@lib/algo/raptor.types';
import * as gtfs from '@lib/gtfs/gtfs.types';
import { RaptorDate } from '@lib/utils/raptor-date.class';
import { RaptorTime } from '@lib/utils/raptor-time.class';

export class Raptor {
    private maxRounds: number = 0;
    private maxDays: number = 0;

    private routes: Route[] = [];
    private stopTimes: StopTime_1[] = [];

    private stops: Stop_1[] = [];
    private transfers: Transfer[] = [];

    private routeStops: RouteStop[] = [];
    private stopRoutes: StopRoute[] = [];

    private services: Service[] = [];

    private stopIdxByStopId: Array<number> = [];

    public load(args: LoadArgs): void {
        this.maxRounds = args.maxRounds;
        this.maxDays = args.maxDays;

        const stopTimes = [...args.stopTimes].sort((a, b) => Number(a['stop_sequence']) - Number(b['stop_sequence']));

        const stopTimesByTripId = stopTimes.reduce<Record<gtfs.TripId, gtfs.StopTime[]>>((acc, stopTime) => {
            const tripId = stopTime['trip_id'];

            acc[tripId] ??= [];
            acc[tripId].push(stopTime);

            return acc;
        }, {});

        const tripsByRouteId = args.trips.reduce<Record<gtfs.RouteId, gtfs.Trip[]>>((acc, trip) => {
            const stopTimes = stopTimesByTripId[trip['trip_id']] || [];
            if (stopTimes.length === 0) acc;

            const stopIds = stopTimes.map((st) => st['stop_id']);
            const routeId = stopIds.join('-');

            acc[routeId] ??= [];
            acc[routeId].push(trip);

            return acc;
        }, {});

        for (const routeId in tripsByRouteId) {
            tripsByRouteId[routeId].sort((a, b) => {
                const stopTimesA = stopTimesByTripId[a['trip_id']];
                const stopTimesB = stopTimesByTripId[b['trip_id']];

                return (
                    RaptorTime.from(stopTimesA[0]['departure_time']).toNumber() -
                    RaptorTime.from(stopTimesB[0]['departure_time']).toNumber()
                );
            });
        }

        const transfersByStopId = args.transfers.reduce<Record<gtfs.StopId, Transfer[]>>((acc, transfer) => {
            const sourceStopId = transfer['from_stop_id'];
            const targetStopId = transfer['to_stop_id'];
            const walkingTime = Number(transfer['min_transfer_time']);

            acc[sourceStopId] ??= [];
            acc[sourceStopId].push({ targetStopId, walkingTime });

            return acc;
        }, {});

        const stopByStopId = args.stops.reduce<Record<gtfs.StopId, gtfs.Stop>>((acc, stop) => {
            acc[stop['stop_id']] = stop;
            return acc;
        }, {});

        const calendarDatesByServiceId = args.calendarDates.reduce<Record<gtfs.ServiceId, Record<'1' | '2', number[]>>>(
            (acc, calendarDate) => {
                const serviceId = calendarDate['service_id'];
                acc[serviceId] ??= { [1]: [], [2]: [] };

                if (calendarDate['exception_type'] === '1') {
                    acc[serviceId][1].push(RaptorDate.from(calendarDate['date']).toNumber());
                } else {
                    acc[serviceId][2].push(RaptorDate.from(calendarDate['date']).toNumber());
                }

                return acc;
            },
            {},
        );

        const calendarByServiceId_2 = args.calendar.reduce<Record<gtfs.ServiceId, gtfs.Calendar>>((acc, calendar) => {
            acc[calendar['service_id']] = calendar;
            return acc;
        }, {});

        for (const routeId in tripsByRouteId) {
            this.routes.push({
                routeId: routeId,
                numberOfTrips: tripsByRouteId[routeId].length,
                numberOfServices: tripsByRouteId[routeId].length,
                numberOfRouteStops: stopTimesByTripId[tripsByRouteId[routeId][0]['trip_id']].length,
                firstTripIdx: this.stopTimes.length,
                firstServiceIdx: this.services.length,
                firstRouteStopIdx: null,
            });

            tripsByRouteId[routeId].forEach((trip) => {
                const stopTimes = stopTimesByTripId[trip['trip_id']] || [];
                stopTimes.forEach((stopTime) => {
                    this.stopTimes.push({
                        stopId: stopTime['stop_id'],
                        tripId: stopTime['trip_id'],
                        arrivalTime: RaptorTime.fromString(stopTime['arrival_time']).toNumber(),
                        departureTime: RaptorTime.fromString(stopTime['departure_time']).toNumber(),
                    });
                });

                const calendar = calendarByServiceId_2[trip['service_id']];
                const calendarDates = calendarDatesByServiceId[trip['service_id']] || {};

                const include: Array<boolean> = [];
                const exclude: Array<boolean> = [];

                (calendarDates[1] || []).forEach((date) => (include[date] = true));
                (calendarDates[2] || []).forEach((date) => (exclude[date] = true));

                this.services.push({
                    serviceId: trip['service_id'],
                    startDate: calendar ? RaptorDate.from(calendar['start_date']).toNumber() : 0,
                    endDate: calendar ? RaptorDate.from(calendar['end_date']).toNumber() : 0,
                    dayOfWeek: [
                        calendar?.sunday === '1',
                        calendar?.monday === '1',
                        calendar?.tuesday === '1',
                        calendar?.wednesday === '1',
                        calendar?.thursday === '1',
                        calendar?.friday === '1',
                        calendar?.saturday === '1',
                    ],
                    exclude,
                    include,
                });
            });
        }

        for (const stopId in stopByStopId) {
            const transfers = transfersByStopId[stopId] || [];

            this.stops.push({
                stopId: stopId,
                numberOfTransfers: transfers.length,
                numberOfStopRoutes: 0,
                firstTransferIdx: this.transfers.length,
                firstStopRouteIdx: this.stopRoutes.length,
            });

            transfers.sort((a, b) => Number(a['targetStopId']) - Number(b['targetStopId']));

            transfers.forEach((transfer) => {
                this.transfers.push({
                    targetStopId: transfer.targetStopId,
                    walkingTime: transfer.walkingTime,
                });
            });
        }

        const routeIdxsByStopIdx: Record<StopIdx, RouteIdx[]> = {};

        for (let routeIdx = 0; routeIdx < this.routes.length; routeIdx++) {
            const { firstTripIdx, numberOfRouteStops } = this.routes[routeIdx];

            this.routes[routeIdx].firstRouteStopIdx = this.routeStops.length;
            for (let stopTimeIdx = firstTripIdx; stopTimeIdx < firstTripIdx + numberOfRouteStops; stopTimeIdx++) {
                const stopIdx = this.stops.findIndex((stop) => stop.stopId === this.stopTimes[stopTimeIdx].stopId);

                this.routeStops.push(stopIdx);

                routeIdxsByStopIdx[stopIdx] ??= [];
                routeIdxsByStopIdx[stopIdx].push(routeIdx);
            }
        }

        for (let stopIdx = 0; stopIdx < this.stops.length; stopIdx++) {
            const stop = this.stops[stopIdx];
            stop.firstStopRouteIdx = this.stopRoutes.length;

            const routeIdxs = routeIdxsByStopIdx[stopIdx] || [];
            stop.numberOfStopRoutes = routeIdxs.length;

            this.stopRoutes.push(...routeIdxs);
            this.stopIdxByStopId[stop.stopId] = stopIdx;
        }
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

        const sourceStopIdx = this.stopIdxByStopId[sourceStopId];
        const targetStopIdx = this.stopIdxByStopId[targetStopId];

        // Intermediate results
        const connectionsByStopIdx: ConnectionsByStopIdx = [];

        // Initialization of the algorithm
        const knownArrivals = Array.from({ length: this.maxRounds + 1 }, () =>
            new Array(this.stops.length).fill(Number.MAX_SAFE_INTEGER),
        );
        const bestArrivals = Array.from({ length: this.stops.length }, () => Number.MAX_SAFE_INTEGER);
        let markedStopIdxs: Set<number> = new Set([sourceStopIdx]);

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
                    const { targetStopId, walkingTime } = this.transfers[transferIdx];
                    const targetStopIdx = this.stopIdxByStopId[targetStopId];

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
                service.include[date] === true ||
                (service.exclude[date] !== true &&
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
