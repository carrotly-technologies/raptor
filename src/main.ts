export * from '@lib/algo/raptor.class';

import { Raptor } from '@lib/algo/raptor.class';
import { loadGTFS } from '@lib/gtfs/load-gtfs.function';
import * as path from 'node:path';

const bootstrap = () => {
    const gtfs = loadGTFS(path.join(__dirname, '..', 'etc'));

    const raptor = new Raptor();

    console.time('Loading phase');
    raptor.load({ ...gtfs, maxTransfers: 10, maxDays: 2 });
    console.timeEnd('Loading phase');

    /* for (let i = 0; i < 5; i++) {
        console.time('Planning phase');
        const journeys = raptor.range({
            sourceStopId: '1014894',
            targetStopId: '1450689',
            date: '2024-09-13',
        });

        console.timeEnd('Planning phase');
    } */

    for (let i = 0; i < 5; i++) {
        console.time('Planning phase');
        const journeys = raptor.cRange({
            sourceStopId: '1014894',
            targetStopId: '1450689',
            date: '2024-09-13',
        });
        console.timeEnd('Planning phase');
    }

    const journeys = raptor.range({
        sourceStopId: '1014894',
        targetStopId: '1450689',
        date: '2024-09-13',
    });

    const cJourneys = raptor.cRange({
        sourceStopId: '1014894',
        targetStopId: '1450689',
        date: '2024-09-13',
    });

    console.log('Journeys found:', journeys.length);
    console.log('CJourneys found:', cJourneys.length);
    // console.log(cJourneys === journeys);
    // console.log('Journeys found:', journeys.length);

    // journeys.forEach((journey, i) => {
    //     console.log(`Journey #${i + 1} | ${RaptorTime.from(journey.departureTime % 86400).toString().slice(0, 5)} - ${RaptorTime.from(journey.arrivalTime % 86400).toString().slice(0, 5)}`);

    //     journey.segments.forEach((segment) => {
    //         const tripId = segment.tripId;
    //         const sourceStopId = segment.sourceStopId;
    //         const targetStopId = segment.targetStopId;
    //         const departureTime = RaptorTime.fromNumber(segment.departureTime).toString();
    //         const arrivalTime = RaptorTime.fromNumber(segment.arrivalTime).toString();

    //         const sourceStop = gtfs.stops.find((stop) => stop['stop_id'] === sourceStopId);
    //         const targetStop = gtfs.stops.find((stop) => stop['stop_id'] === targetStopId);

    //         const sourceStopName = sourceStop['stop_name'];
    //         const targetStopName = targetStop['stop_name'];

    //         if (tripId) {
    //             const trip = gtfs.trips.find((trip) => trip['trip_id'] === tripId);
    //             const route = gtfs.routes.find((route) => route['route_id'] === trip['route_id']);
    //             const agency = gtfs.agency.find((agency) => agency['agency_id'] === route['agency_id']);

    //             const tripHeadsign = trip['trip_headsign'];
    //             const routeType =
    //                 route['route_type'] === '3' ? 'bus' : route['route_type'] === '2' ? 'rail' : 'unknown';
    //             const routeShortName = route['route_short_name'];
    //             const routeLongName = route['route_long_name'];
    //             const agencyName = agency['agency_name'];

    //             console.log(
    //                 `${departureTime.slice(0, 5)} - ${arrivalTime.slice(0, 5)} ${routeType}\t${routeLongName || routeShortName}${tripHeadsign ? ' ' + tripHeadsign : ''}, ${agencyName}, ${sourceStopName} → ${targetStopName} (${tripId})`,
    //             );
    //         } else {
    //             console.log(
    //                 `${departureTime.slice(0, 5)} - ${arrivalTime.slice(0, 5)} foot\t${sourceStopName} → ${targetStopName}`,
    //             );
    //         }
    //     });
    // });
};

bootstrap();
