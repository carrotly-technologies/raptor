import { ConnectionByStopId, Journey, LoadArgs, PlanArgs, RangeArgs, RouteIndex, StopIndex } from '@lib/algo/raptor.types';
import { RouteId, Service, ServiceId, Stop, StopId, StopTime, TripId } from '@lib/gtfs/gtfs.types';
import { RaptorDate } from '@lib/utils/raptor-date.class';
import { RaptorTime } from '@lib/utils/raptor-time.class';
import * as util from 'node:util';

export class Raptor {
    private maxTransfers: number = 0;
    private maxDays: number = 0;

    private routesIdx: Record<RouteId, RouteIndex> = {};
    private stopsIdx: Record<StopId, StopIndex> = {};
    private footpaths: Record<StopId, Record<StopId, number>> = {};

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
    }

    public range(args: RangeArgs): Journey[] {
        const journeys: Journey[] = [];

        const sourceStopId = args.sourceStopId;
        const targetStopId = args.targetStopId;
        const date = RaptorDate.from(args.date);

        const maxTime = RaptorTime.from("24:00:00");
        let time = RaptorTime.from("00:00:00");

        while (time.lt(maxTime)) {
            const candidats_1 = this.plan({ sourceStopId, targetStopId, date, time });
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

    public plan(args: PlanArgs): Journey[] {
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
                let timeShift = 0;

                const route = this.routesIdx[routeId];
                const queueStopIdx = route.stops.findIndex((stop) => stop.stopId === queue[routeId]);

                const stops = route.stops.slice(queueStopIdx);

                for (const stop of stops) {
                    const stopId = stop.stopId;
                    const arrivalTime = this.getArrivalTime(routeId, bestTripId, stopId)?.toNumber() + timeShift;

                    // Can the label be improved in this round?
                    // Includes local and target pruning
                    if (bestTripId && arrivalTime < Math.min(bestArrivals[stopId], bestArrivals[targetStopId])) {
                        const departureTime =
                            this.getDepartureTime(routeId, bestTripId, boardingId)?.toNumber() + timeShift;

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
                        this.getDepartureTime(routeId, bestTripId, stopId)?.toNumber() + timeShift
                    ) {
                        [bestTripId, timeShift] = this.getEarliestTripId(
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

        return this.transformToJourney(connectionByStopId, targetStopId);
    }

    // @todo: optimize search time by using index
    private isStopBefore(routeId: string, leftStopId: string, rightStopId: string): boolean {
        const route = this.routesIdx[routeId];

        const leftStopIdx = route.stops.findIndex((stop) => stop.stopId === leftStopId);
        const rightStopIdx = route.stops.findIndex((stop) => stop.stopId === rightStopId);

        return leftStopIdx < rightStopIdx;
    }

    // Returns arrival time of a trip at a stop
    private getArrivalTime(routeId: string, tripId: string, stopId: string): RaptorTime | null {
        const stopTime = this.routesIdx[routeId]?.tripByTripId[tripId]?.stopTimeByStopId[stopId];

        return stopTime?.arrivalTime || null;
    }

    // Returns departure time of a trip at a stop
    private getDepartureTime(routeId: string, tripId: string, stopId: string): RaptorTime | null {
        const stopTime = this.routesIdx[routeId]?.tripByTripId[tripId]?.stopTimeByStopId[stopId];

        return stopTime?.departureTime || null;
    }

    // Returns the earliest trip that stops at a stop after a minimum arrival time
    private getEarliestTripId(
        routeId: string,
        stopId: string,
        date: RaptorDate,
        time: RaptorTime,
    ): [TripId, number] | null {
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
