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

const bootstrap = () => {
    const gtfs = loadGTFS(path.join(__dirname, '..', 'etc'));
    const raptor = new Raptor();

    console.time('Loading phase');
    raptor.load({ ...gtfs, maxTransfers: 100, maxDays: 3 });
    console.timeEnd('Loading phase');

    // console.time('Planning phase');
    // const results = raptor.plan({
    //     sourceStopId: '1014894',
    //     targetStopId: '1606200',
    //     date: '2024-09-07',
    //     time: '17:00:00',
    // });
    // console.timeEnd('Planning phase');

    console.time('Planning phase');
    const results = raptor.plan({
        sourceStopId: '1014894',
        targetStopId: '1450689',
        date: RaptorDate.fromString('2024-09-06'),
        time: RaptorTime.fromString('17:00:00'),
    });
    console.timeEnd('Planning phase');

    print(gtfs, results);

    // const indexes: Results[] = [];
    // let date = RaptorDate.fromString('2024-09-06');
    // let time = RaptorTime.fromString('17:00:00');

    // let source = [{ stopId: '1014894', time }];
    // let target = [{ stopId: '1606200' }];

    // for (let i = 0; i < 3; i++) {
    //     const results = raptor.plan({
    //         source,
    //         target,
    //         date: date,
    //     });

    //     const journeys = [];

    //     if (journeys.length > 0) {
    //         print(gtfs, journeys);
    //         break;
    //     }

    //     source =
    //     date = RaptorDate.fromNumber(date.toNumber() + 1);
    //     indexes.push(results);
    // }
};

// const foo = (currResults: Results, prevResults: Results, targetStopId: string) => {

// }

// private getJourneysFromConnections(
//     kConnections: ConnectionIndex,
//     prevConnections: ConnectionIndex[],
//     destinations: StopID[]
//   ): Journey[] {

//     const destinationsWithResults = destinations.filter(d => Object.keys(kConnections[d]).length > 0);
//     const initialResults = destinationsWithResults.flatMap(d => this.resultsFactory.getResults(kConnections, d));

//     // reverse the previous connections and then work back through each day pre-pending journeys
//     return prevConnections
//       .reverse()
//       .reduce((journeys, connections) => this.completeJourneys(journeys, connections), initialResults);
//   }

bootstrap();
