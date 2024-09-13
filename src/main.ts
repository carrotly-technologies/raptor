export * from '@lib/algo/raptor.class';

import { Raptor } from '@lib/algo/raptor.class';
import { loadGTFS } from '@lib/gtfs/load-gtfs.function';
import { RaptorTime } from '@lib/utils/raptor-time.class';
import { Journey } from 'dist/algo/raptor.types';
import { GTFS } from 'dist/gtfs/gtfs.types';
import * as path from 'node:path';
import * as util from 'node:util';

const bootstrap = () => {
    const gtfs = loadGTFS(path.join(__dirname, '..', 'etc'));

    const raptor = new Raptor();

    console.time('Loading phase');
    raptor.load({ ...gtfs, maxTransfers: 20, maxDays: 2 });
    console.timeEnd('Loading phase');
    console.log('')

    console.time('Plan V2');
    const v2 = raptor.plan_v2({
        sourceStopId: '1491097',
        targetStopId: '1450499',
        date: '2024-09-14',
        time: '12:00:00',
    });
    console.timeEnd('Plan V2');

    print(v2, gtfs);
    console.log('')

    console.time('Plan V1');
    const v1 = raptor.plan_v1({
        sourceStopId: '1491097',
        targetStopId: '1450499',
        date: '2024-09-14',
        time: '12:00:00',
    });
    console.timeEnd('Plan V1');

    print(v1, gtfs);


    return;

    console.time('Zero transfers');
    for (let i = 0; i < 5; i++) {
        raptor.plan_v2({
            sourceStopId: '1355067',
            targetStopId: '1014871',
            date: '2024-09-06',
            time: '09:00:00',
        });
    }
    console.timeEnd('Zero transfers');

    console.time('One transfer');
    for (let i = 0; i < 5; i++) {
        raptor.plan_v2({
            sourceStopId: '1355067',
            targetStopId: '824745',
            date: '2024-09-06',
            time: '09:00:00',
        });
    }
    console.timeEnd('One transfer');

    console.time('Two transfers');
    for (let i = 0; i < 5; i++) {
        raptor.plan_v2({
            sourceStopId: '1491097',
            targetStopId: '1450499',
            date: '2024-09-14',
            time: '12:00:00',
        });
    }
    console.timeEnd('Two transfers');

    console.time('Three transfers');
    for (let i = 0; i < 5; i++) {
        raptor.plan_v2({
            sourceStopId: '1491097',
            targetStopId: '80416',
            date: '2024-09-14',
            time: '12:00:00',
        });
    }
    console.timeEnd('Three transfers');

    console.time('Four transfers');
    for (let i = 0; i < 5; i++) {
        raptor.plan_v2({
            sourceStopId: '1491097',
            targetStopId: '1450689',
            date: '2024-09-14',
            time: '12:00:00',
        });
    }
    console.timeEnd('Four transfers');

    console.time('Five transfers');
    for (let i = 0; i < 5; i++) {
        raptor.plan_v2({
            sourceStopId: '824788',
            targetStopId: '1606200',
            date: '2024-09-14',
            time: '10:00:00',
        });
    }
    console.timeEnd('Five transfers');

    console.time('Range query');
    for (let i = 0; i < 5; i++) {
        raptor.range({
            sourceStopId: '1014894',
            targetStopId: '1450689',
            date: '2024-09-13',
        });
    }
    console.timeEnd('Range query');

    // console.log('Journeys found:', journeys.length);


};

const print = (journeys: Journey[], gtfs: GTFS) => {
    journeys.forEach((journey, i) => {
        console.log(`Journey #${i + 1} | ${RaptorTime.from(journey.departureTime % 86400).toString().slice(0, 5)} - ${RaptorTime.from(journey.arrivalTime % 86400).toString().slice(0, 5)}`);

        journey.segments.forEach((segment) => {
            const tripId = segment.tripId;
            const sourceStopId = segment.sourceStopId;
            const targetStopId = segment.targetStopId;
            const departureTime = RaptorTime.fromNumber(segment.departureTime).toString();
            const arrivalTime = RaptorTime.fromNumber(segment.arrivalTime).toString();

            const sourceStop = gtfs.stops.find((stop) => stop['stop_id'] === sourceStopId);
            const targetStop = gtfs.stops.find((stop) => stop['stop_id'] === targetStopId);

            const sourceStopName = sourceStop['stop_name'];
            const targetStopName = targetStop['stop_name'];

            if (tripId) {
                const trip = gtfs.trips.find((trip) => trip['trip_id'] === tripId);
                const route = gtfs.routes.find((route) => route['route_id'] === trip['route_id']);
                const agency = gtfs.agency.find((agency) => agency['agency_id'] === route['agency_id']);

                const tripHeadsign = trip['trip_headsign'];
                const routeType =
                    route['route_type'] === '3' ? 'bus' : route['route_type'] === '2' ? 'rail' : 'unknown';
                const routeShortName = route['route_short_name'];
                const routeLongName = route['route_long_name'];
                const agencyName = agency['agency_name'];

                console.log(
                    `${departureTime.slice(0, 5)} - ${arrivalTime.slice(0, 5)} ${routeType}\t${routeLongName || routeShortName}${tripHeadsign ? ' ' + tripHeadsign : ''}, ${agencyName}, ${sourceStopName} → ${targetStopName} (${tripId})`,
                );
            } else {
                console.log(
                    `${departureTime.slice(0, 5)} - ${arrivalTime.slice(0, 5)} foot\t${sourceStopName} → ${targetStopName}`,
                );
            }
        });
    });
}

bootstrap();
