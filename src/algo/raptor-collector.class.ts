import { BuildDatasetArgs, LoadDatasetArgs, LoadGtfsArgs, SaveDatasetArgs } from '@lib/algo/raptor-collector.types';
import { Dataset, Footpath, RouteIdx, StopIdx } from '@lib/algo/raptor.types';
import * as gtfs from '@lib/gtfs/gtfs.types';
import { calculateHaversineDistance } from '@lib/utils/calculate-haversine-distance.function';
import { RaptorDate } from '@lib/utils/raptor-date.class';
import { RaptorTime } from '@lib/utils/raptor-time.class';
import { replacer } from '@lib/utils/replacer.function';
import { reviver } from '@lib/utils/reviver.function';
import { parse } from 'csv-parse';
import * as crypto from 'node:crypto';
import * as stream from 'node:stream';
import { finished } from 'node:stream/promises';

export class RaptorCollector {
    private stops: gtfs.Stop[] = [];
    private stopTimes: gtfs.StopTime[] = [];
    private trips: gtfs.Trip[] = [];
    private calendars: gtfs.Calendar[] = [];
    private calendarDates: gtfs.CalendarDate[] = [];

    private dataset: Dataset = {
        routes: [],
        stopTimes: [],
        stops: [],
        footpaths: [],
        routeStops: [],
        stopRoutes: [],
        services: [],
    };

    public async loadGtfs(args: LoadGtfsArgs): Promise<void> {
        const process = <T>(stream: stream.Readable, target: Array<T>) => {
            return new Promise<void>((resolve, reject) => {
                stream
                    .pipe(parse({ columns: true }))
                    .on('data', (data) => target.push(data))
                    .on('error', (error) => reject(error))
                    .on('end', () => resolve());
            });
        };

        const promises: Promise<void>[] = [];

        args.stops.map((stream) => promises.push(process(stream, this.stops)));
        args.stopTimes.map((stream) => promises.push(process(stream, this.stopTimes)));
        args.trips.map((stream) => promises.push(process(stream, this.trips)));
        args.calendars.map((stream) => promises.push(process(stream, this.calendars)));
        args.calendarDates.map((stream) => promises.push(process(stream, this.calendarDates)));

        await Promise.all(promises);
    }

    public buildDataset(args: BuildDatasetArgs): void {
        const maxWalkingTime = args.maxWalkingTime || 300;
        const avgWalkingSpeed = args.avgWalkingSpeed || 1.33;

        const stopTimes = [...this.stopTimes].sort((a, b) => Number(a['stop_sequence']) - Number(b['stop_sequence']));
        const stopTimesByTripId = this.getStopTimesByTripId(stopTimes);
        const tripsByRouteId = this.getTripsByRouteId(stopTimesByTripId);
        const stopByStopId = this.getStopByStopId();
        const calendarDatesByServiceId = this.getCalendarDatesByServiceId();
        const calendarByServiceId = this.getCalendarByServiceId();
        const footpathsByStopId = args.footpaths ? this.getFootpathsByStopId(maxWalkingTime, avgWalkingSpeed) : {};

        for (const routeId in tripsByRouteId) {
            this.dataset.routes.push({
                routeId: routeId,
                numberOfTrips: tripsByRouteId[routeId].length,
                numberOfServices: tripsByRouteId[routeId].length,
                numberOfRouteStops: stopTimesByTripId[tripsByRouteId[routeId][0]['trip_id']].length,
                firstTripIdx: this.dataset.stopTimes.length,
                firstServiceIdx: this.dataset.services.length,
                firstRouteStopIdx: null,
            });

            tripsByRouteId[routeId].forEach((trip) => {
                const stopTimes = stopTimesByTripId[trip['trip_id']] || [];
                stopTimes.forEach((stopTime) => {
                    this.dataset.stopTimes.push({
                        stopId: stopTime['stop_id'],
                        tripId: stopTime['trip_id'],
                        arrivalTime: RaptorTime.fromString(stopTime['arrival_time']).toNumber(),
                        departureTime: RaptorTime.fromString(stopTime['departure_time']).toNumber(),
                    });
                });

                const calendar = calendarByServiceId[trip['service_id']];
                const calendarDates = calendarDatesByServiceId[trip['service_id']] || {};

                this.dataset.services.push({
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
                    include: (calendarDates[1] || []).reduce((acc, date) => acc.set(date, true), new Map()),
                    exclude: (calendarDates[2] || []).reduce((acc, date) => acc.set(date, true), new Map()),
                });
            });
        }

        for (const stopId in stopByStopId) {
            const transfers = footpathsByStopId[stopId] || [];

            this.dataset.stops.push({
                stopId: stopId,
                numberOfTransfers: transfers.length,
                numberOfStopRoutes: 0,
                firstTransferIdx: this.dataset.footpaths.length,
                firstStopRouteIdx: this.dataset.stopRoutes.length,
            });

            transfers.sort((a, b) => Number(a['targetStopId']) - Number(b['targetStopId']));

            transfers.forEach((transfer) => {
                this.dataset.footpaths.push({
                    targetStopId: transfer.targetStopId,
                    walkingTime: transfer.walkingTime,
                });
            });
        }

        const routeIdxsByStopIdx: Record<StopIdx, RouteIdx[]> = {};
        for (let routeIdx = 0; routeIdx < this.dataset.routes.length; routeIdx++) {
            const { firstTripIdx, numberOfRouteStops } = this.dataset.routes[routeIdx];

            this.dataset.routes[routeIdx].firstRouteStopIdx = this.dataset.routeStops.length;
            for (let stopTimeIdx = firstTripIdx; stopTimeIdx < firstTripIdx + numberOfRouteStops; stopTimeIdx++) {
                const stopIdx = this.dataset.stops.findIndex(
                    (stop) => stop.stopId === this.dataset.stopTimes[stopTimeIdx].stopId,
                );

                this.dataset.routeStops.push(stopIdx);

                routeIdxsByStopIdx[stopIdx] ??= [];
                routeIdxsByStopIdx[stopIdx].push(routeIdx);
            }
        }

        for (let stopIdx = 0; stopIdx < this.stops.length; stopIdx++) {
            const stop = this.dataset.stops[stopIdx];
            stop.firstStopRouteIdx = this.dataset.stopRoutes.length;

            const routeIdxs = routeIdxsByStopIdx[stopIdx] || [];
            stop.numberOfStopRoutes = routeIdxs.length;

            this.dataset.stopRoutes.push(...routeIdxs);
        }
    }

    private getStopTimesByTripId(stopTimes: gtfs.StopTime[]): Record<gtfs.TripId, gtfs.StopTime[]> {
        return stopTimes.reduce<Record<gtfs.TripId, gtfs.StopTime[]>>((acc, stopTime) => {
            const tripId = stopTime['trip_id'];

            acc[tripId] ??= [];
            acc[tripId].push(stopTime);

            return acc;
        }, {});
    }

    private getTripsByRouteId(stopTimesByTripId: Record<string, gtfs.StopTime[]>): Record<gtfs.RouteId, gtfs.Trip[]> {
        const tripsByRouteId = this.trips.reduce<Record<gtfs.RouteId, gtfs.Trip[]>>((acc, trip) => {
            const stopTimes = stopTimesByTripId[trip['trip_id']] || [];
            if (stopTimes.length === 0) return acc;

            const stopIds = stopTimes.map((st) => st['stop_id']);
            const routeId = crypto.createHash('md5').update(stopIds.join('-')).digest('hex');

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

        return tripsByRouteId;
    }

    private getStopByStopId(): Record<gtfs.StopId, gtfs.Stop> {
        return this.stops.reduce<Record<gtfs.StopId, gtfs.Stop>>((acc, stop) => {
            acc[stop['stop_id']] = stop;
            return acc;
        }, {});
    }

    private getCalendarDatesByServiceId(): Record<gtfs.ServiceId, Record<'1' | '2', number[]>> {
        return this.calendarDates.reduce<Record<gtfs.ServiceId, Record<'1' | '2', number[]>>>((acc, calendarDate) => {
            const serviceId = calendarDate['service_id'];
            acc[serviceId] ??= { [1]: [], [2]: [] };

            if (calendarDate['exception_type'] === '1') {
                acc[serviceId][1].push(RaptorDate.from(calendarDate['date']).toNumber());
            } else {
                acc[serviceId][2].push(RaptorDate.from(calendarDate['date']).toNumber());
            }

            return acc;
        }, {});
    }

    private getCalendarByServiceId(): Record<gtfs.ServiceId, gtfs.Calendar> {
        return this.calendars.reduce<Record<gtfs.ServiceId, gtfs.Calendar>>((acc, calendar) => {
            acc[calendar['service_id']] = calendar;
            return acc;
        }, {});
    }

    private getFootpathsByStopId(maxWalkingTime: number, avgWalkingSpeed: number): Record<gtfs.StopId, Footpath[]> {
        const maxWalkingDistance = maxWalkingTime * avgWalkingSpeed;

        return this.stops.reduce<Record<gtfs.StopId, Footpath[]>>((acc, sourceStop) => {
            acc[sourceStop['stop_id']] ??= [];

            this.stops.forEach((targetStop) => {
                if (sourceStop['stop_id'] === targetStop['stop_id']) return;

                const targetStopId = targetStop['stop_id'];
                const walkingDistance = calculateHaversineDistance(
                    Number(sourceStop['stop_lat']),
                    Number(sourceStop['stop_lon']),
                    Number(targetStop['stop_lat']),
                    Number(targetStop['stop_lon']),
                );

                if (walkingDistance < maxWalkingDistance) {
                    const walkingTime = Math.ceil(walkingDistance / avgWalkingSpeed);
                    acc[sourceStop['stop_id']].push({ targetStopId, walkingTime });
                }
            });

            return acc;
        }, {});
    }

    // @todo: Test this approach with a large dataset and see if it works. Marshaling the whole dataset to a JSON string may lead to a memory exhaustion.
    public async loadDataset(args: LoadDatasetArgs): Promise<void> {
        let data = '';

        args.source.on('data', (chunk) => (data += chunk));
        args.source.on('error', (error) => {
            throw error;
        });
        args.source.on('end', () => (this.dataset = JSON.parse(data, reviver)));

        await finished(args.source);
    }

    // @todo: Test this approach with a large dataset and see if it works. Marshaling the whole dataset to a JSON string may lead to a memory exhaustion.
    public async saveDataset(args: SaveDatasetArgs): Promise<void> {
        args.target.write(JSON.stringify(this.dataset, replacer));
        args.target.end();

        await finished(args.target);
    }

    public getDataset(): Dataset {
        return this.dataset;
    }
}
