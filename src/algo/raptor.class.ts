import { ConnectionByStopId, Journey, LoadArgs, PlanArgs, RangeArgs, RouteIndex, StopIndex } from '@lib/algo/raptor.types';
import { RouteId, Service, ServiceId, Stop, StopId, StopTime, Trip, TripId } from '@lib/gtfs/gtfs.types';
import { RaptorDate } from '@lib/utils/raptor-date.class';
import { RaptorTime } from '@lib/utils/raptor-time.class';
import { Calendar } from 'dist/gtfs/gtfs.types';
import * as util from 'node:util';

type RouteIdx = number;
type StopIdx = number;
type StopTimeIdx = number;
type TransferIdx = number;
type RouteStopIdx = number;
type StopRouteIdx = number;
type RouteIdxToStopIdx = Array<number>

interface Route_1 {
    routeId: RouteId;
    numberOfTrips: number;
    numberOfServices: number;
    numberOfRouteStops: number;
    firstTripIdx: number;
    firstServiceIdx: number;
    firstRouteStopIdx: number;
};

interface StopTime_1 {
    tripId: TripId;
    stopId: StopId;
    arrivalTime: number;
    departureTime: number;
};

type RouteStop_1 = number;

interface Stop_1 {
    stopId: StopId;
    numberOfStopRoutes: number;
    numberOfTransfers: number;
    firstStopRouteIdx: number;
    firstTransferIdx: number;
};

interface Transfer_1 {
    targetStopId: StopId;
    walkingTime: number;
}

type StopRoute_1 = number;

interface Service_1 {
    serviceId: ServiceId;
    startDate: number;
    endDate: number;
    dayOfWeek: Array<boolean>;
    exclude: Array<boolean>;
    include: Array<boolean>;
}

export class Raptor {
    private maxTransfers: number = 0;
    private maxDays: number = 0;

    /** @deprecated */
    private routesIdx: Record<RouteId, RouteIndex> = {};

    /** @deprecated */
    private stopsIdx: Record<StopId, StopIndex> = {};

    /** @deprecated */
    private footpaths: Record<StopId, Record<StopId, number>> = {};

    private routes: Route_1[] = [];
    private stopTimes: StopTime_1[] = [];

    private stops: Stop_1[] = [];
    private transfers: Transfer_1[] = [];

    private routeStops: RouteStop_1[] = [];
    private stopRoutes: StopRoute_1[] = [];

    private services: Service_1[] = [];

    private stopIdxByStopId: Array<number> = [];

    public load(args: LoadArgs): void {
        this.maxTransfers = args.maxTransfers;
        this.maxDays = args.maxDays;

        const stopTimes = [...args.stopTimes].sort((a, b) => Number(a['stop_sequence']) - Number(b['stop_sequence']));

        const stopTimesByTripId = stopTimes.reduce<Record<TripId, StopTime[]>>((acc, stopTime) => {
            const tripId = stopTime['trip_id'];

            acc[tripId] ??= [];
            acc[tripId].push(stopTime);

            return acc;
        }, {});

        const tripsByRouteId = args.trips.reduce<Record<RouteId, Trip[]>>((acc, trip) => {
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

                return RaptorTime.from(stopTimesA[0]['departure_time']).toNumber() - RaptorTime.from(stopTimesB[0]['departure_time']).toNumber();
            });
        }

        const transfersByStopId = args.transfers.reduce<Record<StopId, Transfer_1[]>>((acc, transfer) => {
            const sourceStopId = transfer['from_stop_id'];
            const targetStopId = transfer['to_stop_id'];
            const walkingTime = Number(transfer['min_transfer_time']);

            acc[sourceStopId] ??= [];
            acc[sourceStopId].push({ targetStopId, walkingTime });

            return acc;
        }, {});

        const calendarDatesByServiceId_2 = args.calendarDates.reduce<Record<ServiceId, Record<'1' | '2', number[]>>>((acc, calendarDate) => {
            const serviceId = calendarDate['service_id'];

            if (calendarDate['exception_type'] === '1') {
                acc[serviceId] ??= { [1]: [], [2]: [] };
                acc[serviceId][1].push(RaptorDate.from(calendarDate['date']).toNumber());
            } else {
                acc[serviceId] ??= { [1]: [], [2]: [] };
                acc[serviceId][2].push(RaptorDate.from(calendarDate['date']).toNumber());
            }

            return acc;
        }, {});

        const calendarByServiceId_2 = args.calendar.reduce<Record<ServiceId, Calendar>>((acc, calendar) => {
            acc[calendar['service_id']] = calendar;
            return acc;
        }, {});

        // const exceptionsByServiceId = args.calendarDates.reduce<Record<ServiceId, Record<'1' | '2', number[]>>>((acc, calendarDate) => {
        //     const serviceId = calendarDate['service_id'];

        //     if (calendarDate['exception_type'] === '1') {
        //         acc[serviceId] ??= { [1]: [], [2]: [] };
        //         acc[serviceId][1].push(RaptorDate.from(calendarDate['date']).toNumber());
        //     } else {
        //         acc[serviceId] ??= { [1]: [], [2]: [] };
        //         acc[serviceId][2].push(RaptorDate.from(calendarDate['date']).toNumber());
        //     }

        //     return acc;
        // }, {});

        // const serviceByServiceId_1 = args.calendar.reduce<Record<ServiceId, Service_1>>((acc, calendar) => {
        //     const exceptions = exceptionsByServiceId[calendar['service_id']] || {};

        //     const exclude: Array<boolean> = [];
        //     const include: Array<boolean> = [];

        //     (exceptions[1] || []).forEach((date) => exclude[date] = true);
        //     (exceptions[2] || []).forEach((date) => include[date] = true);

        //     acc[calendar['service_id']] = {
        //         serviceId: calendar['service_id'],
        //         startDate: RaptorDate.from(calendar['start_date']).toNumber(),
        //         endDate: RaptorDate.from(calendar['end_date']).toNumber(),
        //         dayOfWeek: [
        //             calendar['sunday'] === '1',
        //             calendar['monday'] === '1',
        //             calendar['tuesday'] === '1',
        //             calendar['wednesday'] === '1',
        //             calendar['thursday'] === '1',
        //             calendar['friday'] === '1',
        //             calendar['saturday'] === '1',
        //         ],
        //         exclude,
        //         include,
        //     }

        //     return acc;
        // }, {});

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
                const calendarDates = calendarDatesByServiceId_2[trip['service_id']] || {};

                const exclude: Array<boolean> = [];
                const include: Array<boolean> = [];

                (calendarDates[1] || []).forEach((date) => exclude[date] = true);
                (calendarDates[2] || []).forEach((date) => include[date] = true);

                this.services.push({
                    serviceId: trip['service_id'],
                    startDate: calendar ? RaptorDate.from(calendar['start_date']).toNumber() : 0,
                    endDate: calendar ? RaptorDate.from(calendar['end_date']).toNumber() : Number.MAX_SAFE_INTEGER,
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

        for (const stopId in transfersByStopId) {
            this.stops.push({
                stopId: stopId,
                numberOfTransfers: transfersByStopId[stopId].length,
                numberOfStopRoutes: 0,
                firstTransferIdx: this.transfers.length,
                firstStopRouteIdx: this.stopRoutes.length,
            });

            transfersByStopId[stopId].forEach((transfer) => {
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


        // const route_1 = this.routes[71];
        // const stopTimes_1 = this.stopTimes.slice(route_1.firstTripIdx, route_1.firstTripIdx + route_1.numberOfTrips * route_1.numberOfRouteStops);

        // for (let i = 0; i < 49; i++) {
        //     console.log(stopTimes_1[21 + i * route_1.numberOfRouteStops]);
        // }

        // throw 'stop';


        // Hmm... seems to be fine

        // const route_1 = this.routes[10];
        // const stopTimes_1 = this.stopTimes.slice(route_1.firstTripIdx, route_1.firstTripIdx + route_1.numberOfTrips * route_1.numberOfRouteStops);
        // const routeStops_1 = this.routeStops.slice(route_1.firstRouteStopIdx, route_1.firstRouteStopIdx + route_1.numberOfRouteStops);

        // console.log(util.inspect(route_1, true, 4, true));
        // console.log(util.inspect(stopTimes_1, true, 4, true));
        // console.log(util.inspect(routeStops_1, true, 4, true));

        // const stop_1 = this.stops[400];
        // const transfers_1 = this.transfers.slice(stop_1.firstTransferIdx, stop_1.firstTransferIdx + stop_1.numberOfTransfers);
        // const stopRoutes_1 = this.stopRoutes.slice(stop_1.firstStopRouteIdx, stop_1.firstStopRouteIdx + stop_1.numberOfStopRoutes);

        // console.log(util.inspect(stop_1, true, 4, true));
        // console.log(util.inspect(transfers_1, true, 4, true));
        // console.log(util.inspect(stopRoutes_1, true, 4, true));

        // @deprecated
        // --- --- ---

        // const stopTimes = [...args.stopTimes].sort((a, b) => Number(a['stop_sequence']) - Number(b['stop_sequence']));
        // const stopTimesByTripId = stopTimes.reduce<Record<TripId, StopTime[]>>((acc, stopTime) => {
        //     const tripId = stopTime['trip_id'];

        //     acc[tripId] ??= [];
        //     acc[tripId].push(stopTime);

        //     return acc;
        // }, {});

        const stopByStopId = args.stops.reduce<Record<StopId, Stop>>((acc, stop) => {
            acc[stop.stop_id] = stop;
            return acc;
        }, {});

        const calendarByServiceId = args.calendar.reduce<Record<ServiceId, Service>>((acc, calendar) => {
            acc[calendar.service_id] = calendar;
            return acc;
        }, {});

        const [includeDatesByServiceId, excludeDatesByServiceId] = args.calendarDates.reduce<
            Record<ServiceId, number[]>[]
        >(
            (acc, calendarDate) => {
                const serviceId = calendarDate.service_id;

                if (calendarDate.exception_type === '1') {
                    acc[0][serviceId] ??= [];
                    acc[0][serviceId].push(Number(calendarDate.date));
                } else {
                    acc[1][serviceId] ??= [];
                    acc[1][serviceId].push(Number(calendarDate.date));
                }

                return acc;
            },
            [{}, {}],
        );

        args.trips.forEach((trip) => {
            const stopTimes = stopTimesByTripId[trip['trip_id']] || [];
            if (stopTimes.length === 0) return;

            const stopIds = stopTimes.map((st) => st['stop_id']);
            const routeId = stopIds.join('-');

            this.routesIdx[routeId] ??= {
                routeId: trip['route_id'],
                tripByTripId: {},
                trips: [],
                stops: [],
            };

            const calendar = calendarByServiceId[trip['service_id']];

            this.routesIdx[routeId].tripByTripId[trip['trip_id']] ??= {
                service: {
                    startDate: calendar ? Number(calendar.start_date) : 0,
                    endDate: calendar ? Number(calendar.end_date) : Number.MAX_SAFE_INTEGER,
                    monday: calendar?.monday === '1',
                    tuesday: calendar?.tuesday === '1',
                    wednesday: calendar?.wednesday === '1',
                    thursday: calendar?.thursday === '1',
                    friday: calendar?.friday === '1',
                    saturday: calendar?.saturday === '1',
                    sunday: calendar?.sunday === '1',
                    exclude: excludeDatesByServiceId[trip['service_id']] || [],
                    include: includeDatesByServiceId[trip['service_id']] || [],
                },
                stopTimeByStopId: {}
            };
            this.routesIdx[routeId].tripByTripId[trip['trip_id']].stopTimeByStopId = stopTimes.reduce<
                Record<StopId, { arrivalTime: RaptorTime; departureTime: RaptorTime }>
            >((acc, stopTime) => {
                acc[stopTime['stop_id']] = {
                    arrivalTime: RaptorTime.fromString(stopTime['arrival_time']),
                    departureTime: RaptorTime.fromString(stopTime['departure_time']),
                };

                return acc;
            }, {});

            this.routesIdx[routeId].trips.push({
                tripId: trip['trip_id'],
                service: {
                    startDate: calendar ? Number(calendar.start_date) : 0,
                    endDate: calendar ? Number(calendar.end_date) : Number.MAX_SAFE_INTEGER,
                    monday: calendar?.monday === '1',
                    tuesday: calendar?.tuesday === '1',
                    wednesday: calendar?.wednesday === '1',
                    thursday: calendar?.thursday === '1',
                    friday: calendar?.friday === '1',
                    saturday: calendar?.saturday === '1',
                    sunday: calendar?.sunday === '1',
                    exclude: excludeDatesByServiceId[trip['service_id']] || [],
                    include: includeDatesByServiceId[trip['service_id']] || [],
                },
                stopTimes: stopTimes.map((stopTime) => ({
                    stopId: stopTime['stop_id'],
                    arrivalTime: RaptorTime.fromString(stopTime['arrival_time']),
                    departureTime: RaptorTime.fromString(stopTime['departure_time']),
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

        this.footpaths = args.transfers.reduce<Record<StopId, Record<StopId, number>>>((acc, transfer) => {
            const fromStopId = transfer['from_stop_id'];
            const toStopId = transfer['to_stop_id'];
            const minTransferTime = Number(transfer['min_transfer_time']);

            acc[fromStopId] ??= {};
            acc[fromStopId][toStopId] = minTransferTime;

            return acc;
        }, {});

        // const stop = this.stops.find((stop) => stop._stopId === '1014871');

        // console.log(this.stopRoutes.slice(stop.firstRouteIdx, stop.firstRouteIdx + stop.numberOfRoutes));
        // console.log(this.stopsIdx['1014871'].routes);

        // const route = this.routes.find((route) => route._routeId = '1450605-1450606-1450608-1450610-1450612-1450614-1450616-1450618-1450620-1450622-1450624-1450626-1450628-1450601-1450598-1450602-824847-824849-824851-824853-824854-824857-824859-824861-824863-1121496-824867-824865-824869-824870-824873-1121498-824874-824877-824878-824881-741752-741756-824884-824885-824888-824890-824892-824893-824896-824906-824904-824902-824901-824898-669524-669525')

        // console.log(util.inspect(route, true, 4, true));
        // console.log(util.inspect(this.routeStops.slice(route.firstStopIdx, route.firstStopIdx + route.numberOfStops), true, 4, true));
        // console.log(util.inspect(this.stopTimes.slice(route.firstTripIdx, route.firstTripIdx + route.numberOfTrips * route.numberOfStops), true, 4, true));
        // console.log('----------------------------')
        // console.log(util.inspect(this.routesIdx['1450605-1450606-1450608-1450610-1450612-1450614-1450616-1450618-1450620-1450622-1450624-1450626-1450628-1450601-1450598-1450602-824847-824849-824851-824853-824854-824857-824859-824861-824863-1121496-824867-824865-824869-824870-824873-1121498-824874-824877-824878-824881-741752-741756-824884-824885-824888-824890-824892-824893-824896-824906-824904-824902-824901-824898-669524-669525'], true, 4, true));
    }

    /** @deprecated */
    public range(args: RangeArgs): Journey[] {
        const journeys: Journey[] = [];

        const sourceStopId = args.sourceStopId;
        const targetStopId = args.targetStopId;
        const date = RaptorDate.from(args.date);

        const maxTime = RaptorTime.from("24:00:00");
        let time = RaptorTime.from("00:00:00");

        while (time.lt(maxTime)) {
            const candidats_1 = this.plan_v2({ sourceStopId, targetStopId, date, time });
            const candidats_2 = candidats_1.filter((journey) => journey.departureTime <= maxTime.toNumber());

            if (candidats_2.length === 0) break;

            journeys.push(...candidats_2);
            time = RaptorTime.fromNumber(candidats_2.reduce((acc, journey) => Math.min(acc, journey.departureTime), Number.MAX_SAFE_INTEGER) + 1);
        }

        const dominated: number[] = [];

        for (let i = 0; i < journeys.length; i++) {
            for (let j = 0; j < journeys.length; j++) {
                if (j === i) {
                    continue;
                }

                if (journeys[i].departureTime >= journeys[j].departureTime && journeys[i].arrivalTime <= journeys[j].arrivalTime) {
                    dominated[j] ??= 0;
                    dominated[j]++;
                }
            }
        }

        return journeys.filter((journey, i) => !dominated[i] || dominated[i] === 0);
    }

    // This method is not allowed to use this.routesIdx, this.stopsIdx and this.footpaths
    // Instead of using tripId, stopId, routeId, etc. it uses indexes
    public plan_v2(args: PlanArgs): Journey[] {
        const sourceStopId = args.sourceStopId;
        const targetStopId = args.targetStopId;
        const date = RaptorDate.from(args.date);
        const time = RaptorTime.from(args.time);

        const sourceStopIdx = this.stopIdxByStopId[sourceStopId];
        const targetStopIdx = this.stopIdxByStopId[targetStopId];

        // Intermediate results
        const connectionByStopIdx: Array<Array<{ tripId: TripId, sourceStopIdx: StopIdx; targetStopIdx: StopIdx; departureTime: number; arrivalTime: number }>> = [];

        // Initialization of the algorithm
        const knownArrivals = Array.from({ length: this.maxTransfers + 1 }, () => new Array(this.stops.length).fill(Number.MAX_SAFE_INTEGER));
        const bestArrivals = Array.from({ length: this.stops.length }, () => Number.MAX_SAFE_INTEGER);
        let markedStopIdxs: Set<number> = new Set([sourceStopIdx]);

        knownArrivals[0][sourceStopIdx] = time.toNumber();

        for (let round = 1; round <= this.maxTransfers && markedStopIdxs.size > 0; round++) {
            // Accumulate routes serving marked stops from previous round
            const queue: RouteIdxToStopIdx = [];

            markedStopIdxs.forEach((markedStopIdx) => {
                const stop = this.stops[markedStopIdx];

                for (let stopRouteIdx = stop.firstStopRouteIdx; stopRouteIdx < stop.firstStopRouteIdx + stop.numberOfStopRoutes; stopRouteIdx++) {
                    const routeIdx = this.stopRoutes[stopRouteIdx];

                    queue[routeIdx] = queue[routeIdx] && this.isStopBefore(routeIdx, queue[routeIdx], markedStopIdx)
                        ? queue[routeIdx]
                        : markedStopIdx;
                }

                markedStopIdxs.delete(markedStopIdx);
            });

            // Travers each route
            queue.forEach((aaa, routeIdx) => {
                let boardingStopTimeIdx: number | null = null;
                let boardingRouteStopIdx: number | null = null;
                let timeShift = 0;

                // console.log(routeIdx);

                const route = this.routes[routeIdx];

                let skipFirstNthStops = 0;

                for (let i = 0; i < route.numberOfRouteStops; i++) {
                    if (this.routeStops[route.firstRouteStopIdx + i] === aaa) {
                        skipFirstNthStops = i;
                        break;
                    }
                }

                for (let routeStopIdx = route.firstRouteStopIdx + skipFirstNthStops; routeStopIdx < route.firstRouteStopIdx + route.numberOfRouteStops; routeStopIdx++) {
                    const arrivalTime = this.stopTimes[boardingStopTimeIdx + routeStopIdx - (route.firstRouteStopIdx + skipFirstNthStops)].arrivalTime + timeShift;
                    const stopIdx = this.routeStops[routeStopIdx];

                    if (boardingStopTimeIdx !== null && arrivalTime < Math.min(bestArrivals[stopIdx], bestArrivals[targetStopIdx])) {
                        const departureTime = this.stopTimes[boardingStopTimeIdx].departureTime + timeShift;
                        const boardingStopIdx = this.routeStops[boardingRouteStopIdx];

                        if (departureTime < connectionByStopIdx[boardingStopIdx]?.[round - 1]?.departureTime) {
                            continue;
                        }

                        const tripId = this.stopTimes[boardingStopTimeIdx].tripId;

                        knownArrivals[round][stopIdx] = arrivalTime;
                        bestArrivals[stopIdx] = arrivalTime;

                        markedStopIdxs.add(stopIdx);

                        connectionByStopIdx[stopIdx] ??= []
                        connectionByStopIdx[stopIdx][round] = {
                            tripId: tripId,
                            sourceStopIdx: boardingStopIdx,
                            targetStopIdx: stopIdx,
                            departureTime,
                            arrivalTime,
                        }
                    }

                    const departureTime = this.stopTimes[boardingStopTimeIdx + routeStopIdx - (route.firstRouteStopIdx + skipFirstNthStops)].departureTime + timeShift;

                    if (boardingStopTimeIdx === null || knownArrivals[round - 1][stopIdx] <= departureTime) {
                        [boardingStopTimeIdx, timeShift] = this.getEarliestBoardingStopTimeIdx(routeIdx, routeStopIdx, date.toNumber(), date.getDayOfWeek_2(), knownArrivals[round - 1][stopIdx]);
                        boardingRouteStopIdx = routeStopIdx;
                    }
                }
            })

            const newMarkedStopIdxs = new Set<number>(markedStopIdxs);

            // Look for footpaths
            markedStopIdxs.forEach((markedStopIdx, routeIdx, markedStopIdxs) => {
                const markedStop = this.stops[markedStopIdx];

                for (let transferIdx = markedStop.firstTransferIdx; transferIdx < markedStop.firstTransferIdx + markedStop.numberOfTransfers; transferIdx++) {
                    const { targetStopId, walkingTime } = this.transfers[transferIdx]
                    const targetStopIdx = this.stopIdxByStopId[targetStopId];

                    const arrivalTime = Math.min(
                        knownArrivals[round][targetStopIdx],
                        knownArrivals[round][markedStopIdx] + walkingTime
                    );

                    if (arrivalTime < bestArrivals[targetStopIdx]) {
                        knownArrivals[round][targetStopIdx] = arrivalTime;
                        bestArrivals[targetStopIdx] = arrivalTime;

                        newMarkedStopIdxs.add(targetStopIdx);

                        connectionByStopIdx[targetStopIdx] ??= []
                        connectionByStopIdx[targetStopIdx][round] = {
                            tripId: undefined,
                            sourceStopIdx: markedStopIdx,
                            targetStopIdx: targetStopIdx,
                            departureTime: arrivalTime - walkingTime,
                            arrivalTime: arrivalTime,
                        }
                    }
                }
            });

            markedStopIdxs = newMarkedStopIdxs;
        }

        return this.reconstructJourneys(connectionByStopIdx, targetStopIdx);
    }

    private reconstructJourneys(connectionByStopIdx: Array<Array<{ tripId: TripId, sourceStopIdx: StopIdx; targetStopIdx: StopIdx; departureTime: number; arrivalTime: number }>>, targetStopIdx: StopIdx): Journey[] {
        const journeys: Journey[] = [];

        (connectionByStopIdx[targetStopIdx] || []).forEach((_, round) => {
            const segments: Journey['segments'] = [];

            let currentStopIdx = targetStopIdx;
            for (let i = round; i > 0; i--) {
                const connection = connectionByStopIdx[currentStopIdx][i];

                segments.unshift({
                    tripId: connection.tripId,
                    sourceStopId: this.stops[connection.sourceStopIdx].stopId,
                    targetStopId: this.stops[connection.targetStopIdx].stopId,
                    departureTime: connection.departureTime,
                    arrivalTime: connection.arrivalTime,
                });

                currentStopIdx = connection.sourceStopIdx;

                if (!connection.tripId) {
                    const connection = connectionByStopIdx[currentStopIdx][i]

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

    private isStopBefore(routeIdx: number, leftStopIdx: number, rightStopIdx: number): boolean {
        const route = this.routes[routeIdx];

        for (let routeStopIdx = route.firstRouteStopIdx; routeStopIdx < route.firstRouteStopIdx + route.numberOfRouteStops; routeStopIdx++) {
            if (this.routeStops[routeStopIdx] === leftStopIdx) {
                return false;
            }

            if (this.routeStops[routeStopIdx] === rightStopIdx) {
                return true;
            }
        }

        return true;
    }

    private getEarliestBoardingStopTimeIdx(routeIdx: number, routeStopIdx: number, date: number, dayOfWeek: number, time: number, retry = this.maxDays): [number, number] {
        const route = this.routes[routeIdx];

        for (
            let stopTimeIdx = route.firstTripIdx + routeStopIdx - route.firstRouteStopIdx,
            serviceIdx = route.firstServiceIdx;
            stopTimeIdx < route.firstTripIdx + route.numberOfTrips * route.numberOfRouteStops;
            stopTimeIdx += route.numberOfRouteStops,
            serviceIdx += 1
        ) {
            const service = this.services[serviceIdx];

            if (service.include[date] === true || (service.exclude[date] !== true && service.startDate <= date && date <= service.endDate && service.dayOfWeek[dayOfWeek])) {
                if (this.stopTimes[stopTimeIdx].arrivalTime >= time) {
                    return [stopTimeIdx, 86400 * (this.maxDays - retry)];
                }
            }
        }

        return retry > 0 ? this.getEarliestBoardingStopTimeIdx(routeIdx, routeStopIdx, date + 1, (dayOfWeek + 1) % 7, 0, retry - 1) : [null, 0]
    }

    /** @deprecated */
    // Deprecated in favor of 'plan'
    public plan_v1(args: PlanArgs): Journey[] {
        const sourceStopId = args.sourceStopId;
        const targetStopId = args.targetStopId;
        const date = RaptorDate.from(args.date);
        const time = RaptorTime.from(args.time);

        // Intermediate results
        const connectionByStopId: ConnectionByStopId = {};

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

        knownArrivals[0][sourceStopId] = time.toNumber();
        markedStopIds.add(sourceStopId);

        for (let k = 1; k < this.maxTransfers && markedStopIds.size > 0; k++) {
            // Accumulate routes serving marked stops from previous round
            const queue: Record<RouteId, StopId> = {};

            for (const markedStopId of markedStopIds) {
                const routes = this.stopsIdx[markedStopId].routes;

                for (const route of routes) {
                    const routeId = route.routeId;

                    queue[routeId] =
                        queue[routeId] && this.isStopBefore_v0(routeId, queue[routeId], markedStopId)
                            ? queue[routeId]
                            : markedStopId;
                }

                markedStopIds.delete(markedStopId);
            }

            // console.log('V0', k, Object.keys(queue).length);

            // Travers each route
            for (const routeId in queue) {
                let bestTripId: TripId | null = null;
                let boardingId: StopId | null = null;
                let timeShift = 0;

                const route = this.routesIdx[routeId];
                const queueStopIdx = route.stops.findIndex((stop) => stop.stopId === queue[routeId]);

                const stops = route.stops.slice(queueStopIdx);

                for (const stop of stops) {
                    const stopId = stop.stopId;
                    const arrivalTime = this.getArrivalTime_v0(routeId, bestTripId, stopId)?.toNumber() + timeShift;

                    // console.log('V0', arrivalTime, bestArrivals[stopId], bestArrivals[targetStopId])

                    // Can the label be improved in this round?
                    // Includes local and target pruning
                    if (bestTripId && arrivalTime < Math.min(bestArrivals[stopId], bestArrivals[targetStopId])) {
                        const departureTime =
                            this.getDepartureTime_v0(routeId, bestTripId, boardingId)?.toNumber() + timeShift;

                        if (departureTime < connectionByStopId[boardingId]?.[k - 1]?.departureTime) {
                            // @fixme
                            // This is some temporary workaround because for some reason the actual
                            // implementation sometimes returns journeys were transfers require time travel
                            //
                            // Example:
                            // 28:24 - 31:29 rail      DUNAJEC, Koleje Małopolskie sp. z o.o., NOWY SĄCZ → KRAKÓW GŁÓWNY (2023_2024_1529368)
                            // 27:57 - 29:07 rail      SKA2, Koleje Małopolskie sp. z o.o., KRAKÓW GŁÓWNY → ZATOR (2023_2024_1529585)
                            //
                            // We cannot take the train at 27:57 because we arrive at 31:29

                            continue;
                        }

                        knownArrivals[k][stopId] = arrivalTime;
                        bestArrivals[stopId] = arrivalTime;
                        markedStopIds.add(stopId);

                        connectionByStopId[stopId] ??= {};
                        connectionByStopId[stopId][k] = {
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
                        knownArrivals[k - 1][stop.stopId] <=
                        this.getDepartureTime_v0(routeId, bestTripId, stopId)?.toNumber() + timeShift
                    ) {
                        [bestTripId, timeShift] = this.getEarliestTripId_v0(
                            routeId,
                            stopId,
                            date,
                            RaptorTime.fromNumber(knownArrivals[k - 1][stop.stopId]),
                        );
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

                        connectionByStopId[targetStopId] ??= {};
                        connectionByStopId[targetStopId][k] = {
                            sourceStopId: markedStopId,
                            targetStopId: targetStopId,
                            departureTime: arrivalTime - walkingTime,
                            arrivalTime: arrivalTime,
                        };
                    }
                }
            }
        }

        // console.log('V0', connectionByStopId)

        return this.transformToJourney(connectionByStopId, targetStopId);
    }

    // @todo: optimize search time by using index
    private isStopBefore_v0(routeId: string, leftStopId: string, rightStopId: string): boolean {
        const route = this.routesIdx[routeId];

        const leftStopIdx = route.stops.findIndex((stop) => stop.stopId === leftStopId);
        const rightStopIdx = route.stops.findIndex((stop) => stop.stopId === rightStopId);

        return leftStopIdx < rightStopIdx;
    }

    // Returns arrival time of a trip at a stop
    private getArrivalTime_v0(routeId: string, tripId: string, stopId: string): RaptorTime | null {
        const stopTime = this.routesIdx[routeId]?.tripByTripId[tripId]?.stopTimeByStopId[stopId];

        return stopTime?.arrivalTime || null;
    }

    // Returns departure time of a trip at a stop
    private getDepartureTime_v0(routeId: string, tripId: string, stopId: string): RaptorTime | null {
        const stopTime = this.routesIdx[routeId]?.tripByTripId[tripId]?.stopTimeByStopId[stopId];

        return stopTime?.departureTime || null;
    }

    // Returns the earliest trip that stops at a stop after a minimum arrival time
    private getEarliestTripId_v0(
        routeId: string,
        stopId: string,
        date: RaptorDate,
        time: RaptorTime,
    ): [TripId, number] | null {
        // console.log('V0', time.toNumber())
        const route = this.routesIdx[routeId];

        const stops = route.stops;
        const stopIdx = stops.findIndex((stop) => stop.stopId === stopId);

        let dateNumber = date.toNumber();
        let dayOfWeek = date.getDayOfWeek();
        let timeNumber = time.toNumber();

        for (let i = 0; i < this.maxDays; i++) {
            const trips = route.trips
                .filter(
                    (trip) =>
                        trip.service.include.includes(dateNumber) ||
                        (!trip.service.exclude.includes(dateNumber) &&
                            trip.service.startDate <= dateNumber &&
                            trip.service.endDate >= dateNumber &&
                            trip.service[dayOfWeek]),
                )
                .filter((trip) => trip.stopTimes[stopIdx].arrivalTime.toNumber() >= timeNumber);

            if (trips.length > 0) {
                const trip = trips.reduce(
                    (best, current) =>
                        current.stopTimes[stopIdx].departureTime < best.stopTimes[stopIdx].departureTime
                            ? current
                            : best,
                    trips[0],
                );

                return [trip.tripId, i * 86400];
            }

            const nextDate = RaptorDate.fromNumber(date.toNumber() + 1);
            dateNumber = nextDate.toNumber();
            dayOfWeek = nextDate.getDayOfWeek();
            timeNumber = 0;
        }

        return [null, 0];
    }

    // Transforms the intermediate results into a journey interface
    private transformToJourney(results: ConnectionByStopId, targetStopId: StopId): Journey[] {
        const journeys: Journey[] = [];

        for (const k of Object.keys(results[targetStopId] || {})) {
            const segments: Journey['segments'] = [];

            let currentStopId = targetStopId;
            for (let i = parseInt(k, 10); i > 0; i--) {
                const transit = results[currentStopId][i];

                segments.push({
                    tripId: transit.bestTripId,
                    sourceStopId: transit.sourceStopId,
                    targetStopId: transit.targetStopId,
                    departureTime: transit.departureTime,
                    arrivalTime: transit.arrivalTime,
                });

                currentStopId = transit.sourceStopId;

                if (!transit.bestTripId) {
                    const transit = results[currentStopId][i];

                    segments.push({
                        tripId: transit.bestTripId,
                        sourceStopId: transit.sourceStopId,
                        targetStopId: transit.targetStopId,
                        departureTime: transit.departureTime,
                        arrivalTime: transit.arrivalTime,
                    });

                    currentStopId = transit.sourceStopId;
                }
            }

            segments.reverse();
            journeys.push({
                segments,
                departureTime: segments[0].departureTime,
                arrivalTime: segments[segments.length - 1].arrivalTime,
            });
        }

        return journeys;
    }
}
