import { Journey } from '../algo/raptor.types';
import { GTFS } from '../gtfs/gtfs.types';
import { RaptorTime } from '../utils/raptor-time.class';

export const printJourneys = (journeys: Journey[], gtfs: GTFS) => {
    journeys.forEach((journey, i) => {
        const departureTime = RaptorTime.from(journey.departureTime % 86400)
            .toString()
            .slice(0, 5);
        const arrivalTime = RaptorTime.from(journey.arrivalTime % 86400)
            .toString()
            .slice(0, 5);

        console.log(`Journey #${i + 1} | ${departureTime} - ${arrivalTime}`);

        journey.segments.forEach((segment) => {
            const tripId = segment.tripId;
            const sourceStopId = segment.sourceStopId;
            const targetStopId = segment.targetStopId;

            const departureTime = RaptorTime.fromNumber(segment.departureTime).toString().slice(0, 5);
            const arrivalTime = RaptorTime.fromNumber(segment.arrivalTime).toString().slice(0, 5);

            const sourceStop = gtfs.stops.find((stop) => stop['stop_id'] === sourceStopId);
            const targetStop = gtfs.stops.find((stop) => stop['stop_id'] === targetStopId);

            const sourceStopName = sourceStop['stop_name'];
            const targetStopName = targetStop['stop_name'];

            if (tripId) {
                const trip = gtfs.trips.find((trip) => trip['trip_id'] === tripId);
                const route = gtfs.routes.find((route) => route['route_id'] === trip['route_id']);
                const agency = gtfs.agency.find((agency) => agency['agency_id'] === route['agency_id']);

                // prettier-ignore
                const routeType = route['route_type'] === '3'
                    ? 'bus'
                    : route['route_type'] === '2'
                        ? 'rail'
                        : 'unknown';

                const tripHeadsign = trip['trip_headsign'];
                const routeShortName = route['route_short_name'];
                const routeLongName = route['route_long_name'];
                const agencyName = agency['agency_name'];

                const routeInfo = `${routeLongName || routeShortName}${tripHeadsign ? ' ' + tripHeadsign : ''}, ${agencyName}, ${sourceStopName} → ${targetStopName} (${tripId})`;
                console.log(`${departureTime} - ${arrivalTime} ${routeType}\t${routeInfo}`);
            } else {
                const routeInfo = `${sourceStopName} → ${targetStopName}`;
                console.log(`${departureTime} - ${arrivalTime} foot\t${routeInfo}`);
            }
        });
    });
};
