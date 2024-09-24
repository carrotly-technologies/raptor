import { Raptor } from '@lib/algo/raptor.class';
import { GtfsLoader } from '@lib/gtfs/gtfs-loader.class';
import * as path from 'node:path';

const bootstrap = () => {
    const sourceStopId = process.argv[2];
    const targetStopId = process.argv[3];
    const date = process.argv[4];
    const time = process.argv[5];

    if (!sourceStopId || !targetStopId || !date || !time) {
        console.error('Invalid arguments! Usage: CMD <sourceStopId> <targetStopId> <date> <time>');
        process.exit(1);
    }

    const loader = new GtfsLoader();
    console.time('Gtfs phase');
    const gtfs = loader.load(path.join(__dirname, '..', '..', 'etc'));
    console.timeEnd('Gtfs phase');

    const raptor = new Raptor({
        maxRounds: 10,
        maxDays: 1,
        footpaths: 'transfers',
    });

    console.time('Loading phase');
    // raptor.load({ url: path.join(__dirname, '..', '..', 'etc', 'gtfs-buses.zip') });
    raptor.load({ ...gtfs });
    console.timeEnd('Loading phase');

    console.time('Dumping phase');
    raptor.dump({ url: path.join(__dirname, '..', '..', 'etc') });
    console.timeEnd('Dumping phase');

    // console.time('Planing phase');
    // const journeys = raptor.plan({
    //     sourceStopId,
    //     targetStopId,
    //     date,
    //     time,
    // });
    // console.timeEnd('Planing phase');

    // printJourneys(journeys, gtfs);
};

bootstrap();
