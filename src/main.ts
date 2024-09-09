import * as path from 'path';
import { Raptor } from './algo/raptor.class';
import { Journey } from './algo/raptor.types';
import { GTFS } from './gtfs/gtfs.types';
import { loadGTFS } from './gtfs/load-gtfs.function';
import { RaptorDate } from './utils/raptor-date.class';
import { RaptorTime } from './utils/raptor-time.class';

const print = (gtfs: GTFS, journeys: Journey[]) => {
    console.log('@carrotly/raptor');

    journeys.forEach((journey, i) => {
        console.log(`Journey #${i + 1}`);

        journey.segments.forEach((segment) => {
            const tripId = segment.tripId;
            const sourceStopId = segment.sourceStopId;
            const targetStopId = segment.targetStopId;
            const departureTime = RaptorTime.fromNumber(segment.departureTime % 86400).toString();
            const arrivalTime = RaptorTime.fromNumber(segment.arrivalTime % 86400).toString();

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
};

const bootstrap = () => {
    const gtfs = loadGTFS(path.join(__dirname, '..', 'etc'));
    const raptor = new Raptor();

    console.time('Loading phase');
    raptor.load({ ...gtfs, maxTransfers: 100, maxDays: 3 });
    console.timeEnd('Loading phase');

    console.time('Planning phase');
    const results = raptor.plan({
        sourceStopId: '1014894',
        targetStopId: '1450689',
        date: RaptorDate.fromString('2024-09-06'),
        time: RaptorTime.fromString('09:00:00'),
    });
    console.timeEnd('Planning phase');

    print(gtfs, results);
};

bootstrap();
