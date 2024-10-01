import * as fs from 'node:fs';
import * as http from 'node:http';
import * as https from 'node:https';
import * as crypto from 'node:crypto';
import * as unzipper from 'unzipper';
import * as axios from 'axios';

import { parse } from 'csv-parse';
import { Route, Stop, StopTime, Transfer, RouteStop, Service, StopRoute } from '@lib/algo/raptor.types';
import { arrayify } from '@lib/utils/arrayify.function';

import { RaptorTime } from '@lib/utils/raptor-time.class';
import { RaptorDate } from '@lib/utils/raptor-date.class';
import { calculateHaversineDistance } from '@lib/utils/calculate-haversine-distance.function';

namespace gtfs {
    export type RouteId = string;
    export type StopId = string;
    export type TripId = string;
    export type ServiceId = string;

    export type StopIdx = number;
    export type RouteIdx = number;

    export interface Stop {
        stop_id: string;
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
}

namespace raptor {
    export interface Index {
        routes: Route[];
        stopTimes: StopTime[];
        stops: Stop[];
        transfers: Transfer[];
        routeStops: RouteStop[];
        stopRoutes: StopRoute[];
        services: Service[];
    }
}

export interface LoadArgs {
    url: string | string[];
}

export interface BuildArgs {
    avgWalkingSpeed?: number;
    maxWalkingTime?: number;
}

export interface SaveArgs {
    url: string;
}

/**
 * Developer stories:
 * 
 * As a developer, I want to load GTFS from local file system where it is stored in one or many ZIP archives.
 * As a developer, I want to load GTFS from remote file system where it is stored in one or many ZIP archives.
 * As a developer, I want to be able to retrieve the index built by the collector from GTFS data as a object.
 * As a developer, I want to be able to store the index built by the collector from GTFS data as a file in the local file system.
 * As a developer, I want to be able to store the index built by the collector from GTFS data as a file in the remote file system.
 * As a developer, I want to be able to load the index stored in the local file system and return it as an object.
 * As a developer, I want to be able to load the index stored in the remote file system and return it as an object.
 */
export class RaptorCollector {
    private stops: gtfs.Stop[] = [];
    private stopTimes: gtfs.StopTime[] = [];
    private trips: gtfs.Trip[] = [];
    private calendars: gtfs.Calendar[] = [];
    private calendarDates: gtfs.CalendarDate[] = [];

    private index: raptor.Index = {
        routes: [],
        stopTimes: [],
        stops: [],
        transfers: [],
        routeStops: [],
        stopRoutes: [],
        services: [],
    };

    public async load(args: LoadArgs) {
        const urls = arrayify(args.url);

        const savers = new Map([
            ['stops.txt', (data) => this.stops.push(data)],
            ['stop_times.txt', (data) => this.stopTimes.push(data)],
            ['trips.txt', (data) => this.trips.push(data)],
            ['calendar.txt', (data) => this.calendars.push(data)],
            ['calendar_dates.txt', (data) => this.calendarDates.push(data)],
        ]);

        const loaders = new Map([
            ['fs', (url) => unzipper.Open.file(url)],
            ['http', (url) => new Promise<unzipper.CentralDirectory>((resolve, reject) => {
                axios.default.get(url, { responseType: 'arraybuffer' })
                    .then((response) => unzipper.Open.buffer(response.data))
                    .then((directory) => resolve(directory))
                    .catch((error) => reject(error));
            })]
        ]);

        const promises = urls.map(async (url) => {
            const loader = loaders.get(url.startsWith('http://') || url.startsWith('https://') ? 'http' : 'fs');

            const directory = await loader(url);
            const files = directory.files.filter((file) => ['stops.txt', 'stop_times.txt', 'trips.txt', 'calendar.txt', 'calendar_dates.txt'].includes(file.path));

            const promises = files.map((file) => new Promise<void>((resolve, reject) => {
                file.stream().pipe(parse({ columns: true }))
                    .on('data', (data) => (savers.get(file.path) || (() => { }))(data))
                    .on('error', (error) => reject(error))
                    .on('end', () => resolve())
            }));

            return Promise.all(promises);
        });

        return Promise.all(promises);
    }

    public build(args: BuildArgs) {
        // console.log('#stops', this.stops.length)                    // 4288     + 137   = 4425
        // console.log('#stopTimes', this.stopTimes.length)            // 63526    + 46762 = 110288
        // console.log('#trips', this.trips.length)                    // 1696     + 2034  = 3730
        // console.log('#calendars', this.calendars.length)            // 128      + 0     = 128
        // console.log('#calendarDates', this.calendarDates.length)    // 337      + 14646 = 14983   

        const stopTimes = [...this.stopTimes].sort((a, b) => Number(a['stop_sequence']) - Number(b['stop_sequence']));

        const stopTimesByTripId = stopTimes.reduce<Record<gtfs.TripId, gtfs.StopTime[]>>((acc, stopTime) => {
            const tripId = stopTime['trip_id'];

            acc[tripId] ??= [];
            acc[tripId].push(stopTime);

            return acc;
        }, {});

        const tripsByRouteId = this.trips.reduce<Record<gtfs.RouteId, gtfs.Trip[]>>((acc, trip) => {
            const stopTimes = stopTimesByTripId[trip['trip_id']] || [];
            if (stopTimes.length === 0) acc;

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

        // stops.forEach((sourceStop) => {
        //     stops.forEach((targetStop) => {
        //         if (sourceStop['stop_id'] === targetStop['stop_id']) return;

        //         const walkingDistance = calculateHaversineDistance(
        //             Number(sourceStop['stop_lat']),
        //             Number(sourceStop['stop_lon']),
        //             Number(targetStop['stop_lat']),
        //             Number(targetStop['stop_lon']),
        //         );

        //         if (walkingDistance > maxWalkingDistance) return;

        //         const walkingTime = Math.ceil(walkingDistance / walkingSpeed);
        //         transfers.push(`${sourceStop['stop_id']},${targetStop['stop_id']},2,${walkingTime}`);
        //     });
        // });

        const maxWalkingDistance = args.maxWalkingTime * args.maxWalkingTime;

        const transfersByStopId = this.stops.reduce<Record<gtfs.StopId, Transfer[]>>((acc, sourceStop) => {
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

                if (walkingDistance > maxWalkingDistance) return;
                const walkingTime = Math.ceil(walkingDistance / args.avgWalkingSpeed);

                acc[sourceStop['stop_id']].push({ targetStopId, walkingTime });
            });

            return acc;
        }, {});

        const stopByStopId = this.stops.reduce<Record<gtfs.StopId, gtfs.Stop>>((acc, stop) => {
            acc[stop['stop_id']] = stop;
            return acc;
        }, {});

        const calendarDatesByServiceId = this.calendarDates.reduce<Record<gtfs.ServiceId, Record<'1' | '2', number[]>>>(
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

        const calendarByServiceId = this.calendars.reduce<Record<gtfs.ServiceId, gtfs.Calendar>>((acc, calendar) => {
            acc[calendar['service_id']] = calendar;
            return acc;
        }, {});

        for (const routeId in tripsByRouteId) {
            this.index.routes.push({
                routeId: routeId,
                numberOfTrips: tripsByRouteId[routeId].length,
                numberOfServices: tripsByRouteId[routeId].length,
                numberOfRouteStops: stopTimesByTripId[tripsByRouteId[routeId][0]['trip_id']].length,
                firstTripIdx: this.index.stopTimes.length,
                firstServiceIdx: this.index.services.length,
                firstRouteStopIdx: null,
            });

            tripsByRouteId[routeId].forEach((trip) => {
                const stopTimes = stopTimesByTripId[trip['trip_id']] || [];
                stopTimes.forEach((stopTime) => {
                    this.index.stopTimes.push({
                        stopId: stopTime['stop_id'],
                        tripId: stopTime['trip_id'],
                        arrivalTime: RaptorTime.fromString(stopTime['arrival_time']).toNumber(),
                        departureTime: RaptorTime.fromString(stopTime['departure_time']).toNumber(),
                    });
                });

                const calendar = calendarByServiceId[trip['service_id']];
                const calendarDates = calendarDatesByServiceId[trip['service_id']] || {};

                const include: Array<boolean> = [];
                const exclude: Array<boolean> = [];

                (calendarDates[1] || []).forEach((date) => (include[date] = true));
                (calendarDates[2] || []).forEach((date) => (exclude[date] = true));

                this.index.services.push({
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

            this.index.stops.push({
                stopId: stopId,
                numberOfTransfers: transfers.length,
                numberOfStopRoutes: 0,
                firstTransferIdx: this.index.transfers.length,
                firstStopRouteIdx: this.index.stopRoutes.length,
            });

            transfers.sort((a, b) => Number(a['targetStopId']) - Number(b['targetStopId']));

            transfers.forEach((transfer) => {
                this.index.transfers.push({
                    targetStopId: transfer.targetStopId,
                    walkingTime: transfer.walkingTime,
                });
            });
        }

        const routeIdxsByStopIdx: Record<gtfs.StopIdx, gtfs.RouteIdx[]> = {};

        for (let routeIdx = 0; routeIdx < this.index.routes.length; routeIdx++) {
            const { firstTripIdx, numberOfRouteStops } = this.index.routes[routeIdx];

            this.index.routes[routeIdx].firstRouteStopIdx = this.index.routeStops.length;
            for (let stopTimeIdx = firstTripIdx; stopTimeIdx < firstTripIdx + numberOfRouteStops; stopTimeIdx++) {
                const stopIdx = this.index.stops.findIndex((stop) => stop.stopId === this.stopTimes[stopTimeIdx].stopId);

                this.index.routeStops.push(stopIdx);

                routeIdxsByStopIdx[stopIdx] ??= [];
                routeIdxsByStopIdx[stopIdx].push(routeIdx);
            }
        }

        for (let stopIdx = 0; stopIdx < this.stops.length; stopIdx++) {
            const stop = this.index.stops[stopIdx];
            stop.firstStopRouteIdx = this.index.stopRoutes.length;

            const routeIdxs = routeIdxsByStopIdx[stopIdx] || [];
            stop.numberOfStopRoutes = routeIdxs.length;

            this.index.stopRoutes.push(...routeIdxs);
        }
    }

    // loadFromLocalFileSystem(...)
    // loadFromRemoteFileSystem(...)
    // buildIndex(...)
    // saveToLocalFileSystem(...)
    // saveToRemoteFileSystem(...)
    // getIndex()

    public save(args: SaveArgs) { }

    public get = () => this.index;
}

// export abstract class GtfsLoader {
//     public abstract load(args: { url: string }): Promise<Buffer[]>;
// }

// export class FileSystemGtfsLoader extends GtfsLoader {
//     public async load(args: { url: string }): Promise<Buffer[]> {
//         console.log('#A');

//         return new Promise((resolve, reject) => {
//             const entries: Buffer[] = [];

//             console.log('#B');
//             fs.createReadStream(args.url)
//                 .pipe(unzipper.Parse())
//                 .on('entry', (entry: unzipper.Entry) => {
//                     console.log('#C', entry.path);
//                     entries.push(entry.buffer())
//                     entry.autodrain();
//                 })
//                 .on('error', (error) => {
//                     console.log('#D', error);
//                     reject(error)
//                 })
//                 .on('finish', () => {
//                     console.log('#E', entries.length);
//                     resolve(entries)
//                 });

//             console.log('#F');
//         });
//     }
// }

// export class HttpGtfsLoader extends GtfsLoader {
//     public async load(args: { url: string }): Promise<unzipper.Entry[]> {
//         return new Promise((resolve, reject) => {
//             const entries: unzipper.Entry[] = [];

//             http.get(args.url, (response) => {
//                 response.pipe(unzipper.Parse())
//                     .on('entry', (entry: unzipper.Entry) => entries.push(entry))
//                     .on('error', (error) => reject(error))
//                     .on('finish', () => resolve(entries));
//             });
//         });
//     }
// }

// export class HttpsGtfsLoader extends GtfsLoader {
//     public async load(args: { url: string }): Promise<unzipper.Entry[]> {
//         return new Promise((resolve, reject) => {
//             const entries: unzipper.Entry[] = [];

//             https.get(args.url, (response) => {
//                 response.pipe(unzipper.Parse())
//                     .on('entry', (entry: unzipper.Entry) => entries.push(entry))
//                     .on('error', reject)
//                     .on('finish', () => resolve(entries));
//             });
//         });
//     }
// }
