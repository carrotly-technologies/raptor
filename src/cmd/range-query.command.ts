import { RaptorV1 } from '@lib/algo/raptor-v1.class';
import { GtfsLoader } from '@lib/gtfs/gtfs-loader.class';
import { printJourneys } from '@lib/utils/print-journeys.function';
import * as path from 'node:path';

const bootstrap = () => {
    const sourceStopId = process.argv[2];
    const targetStopId = process.argv[3];
    const date = process.argv[4];

    if (!sourceStopId || !targetStopId || !date) {
        console.error('Invalid arguments! Usage: CMD <sourceStopId> <targetStopId> <date>');
        process.exit(1);
    }

    const loader = new GtfsLoader();
    const gtfs = loader.load(path.join(__dirname, '..', '..', 'etc'));

    const raptor = new RaptorV1();

    console.time('Loading phase');
    raptor.load({ ...gtfs, maxRounds: 10, maxDays: 1 });
    console.timeEnd('Loading phase');

    console.time('Planing phase');
    const journeys = raptor.range({
        sourceStopId,
        targetStopId,
        date,
    });
    console.timeEnd('Planing phase');

    printJourneys(journeys, gtfs);
};

bootstrap();
