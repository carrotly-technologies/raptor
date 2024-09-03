import * as path from 'path';
import { Raptor } from './algo/raptor.class';
import { loadGTFS } from './gtfs/load-gtfs.function';

const bootstrap = () => {
    const gtfs = loadGTFS(path.join(__dirname, '..', 'etc'));
    const raptor = new Raptor();

    console.time('Loading phase');
    raptor.load({ ...gtfs, maxTransfers: 3 });
    console.timeEnd('Loading phase');

    console.time('Planning phase');
    const journey = raptor.plan({
        sourceStopId: '1355067',
        targetStopId: '824745',
        departureTime: '15:30:00',
    });
    console.timeEnd('Planning phase');

    console.log('Journeys:');
    journey.segments.forEach((segment) => {
        const tripId = segment.tripId;
        const sourceStopId = segment.sourceStopId;
        const targetStopId = segment.targetStopId;
        const departureTime = segment.departureTime;
        const arrivalTime = segment.arrivalTime;

        console.log(`Take trip ${tripId} from stop ${sourceStopId} at ${departureTime} to stop ${targetStopId} at ${arrivalTime}`);
    });
};

bootstrap()
