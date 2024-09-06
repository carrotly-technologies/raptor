import * as path from 'path';
import { Raptor } from './algo/raptor.class';
import { loadGTFS } from './gtfs/load-gtfs.function';

const bootstrap = () => {
    const gtfs = loadGTFS(path.join(__dirname, '..', 'etc'));
    const raptor = new Raptor();

    console.time('Loading phase');
    raptor.load({ ...gtfs, maxTransfers: 100 });
    console.timeEnd('Loading phase');

    console.time('Planning phase');
    const journeys = raptor.plan({
        sourceStopId: '1014894',
        targetStopId: '1606200',
        departureTime: '11:45:00',
    });
    console.timeEnd('Planning phase');

    console.log('@carrotly/raptor');

    journeys.forEach((journey, i) => {
        console.log(`Journey #${i + 1}`);

        journey.segments.forEach((segment) => {
            const tripId = segment.tripId;
            const sourceStopId = segment.sourceStopId;
            const targetStopId = segment.targetStopId;
            const departureTime = segment.departureTime;
            const arrivalTime = segment.arrivalTime;

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
                // console.log(`Take trip ${tripId} from stop ${sourceStopId} at ${departureTime} to stop ${targetStopId} at ${arrivalTime}`);
            } else {
                console.log(
                    `${departureTime.slice(0, 5)} - ${arrivalTime.slice(0, 5)} foot\t${sourceStopName} → ${targetStopName}`,
                );
                // console.log(`Walk from stop ${sourceStopId} to stop ${targetStopId} in ${secondsToTime(timeToSeconds(arrivalTime) - timeToSeconds(departureTime))}`)
            }
        });
    });
};

bootstrap();
