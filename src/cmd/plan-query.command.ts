import { RaptorCollector } from '@lib/algo/raptor-collector.class';
import { Raptor } from '@lib/algo/raptor.class';
import { GtfsLoader } from '@lib/gtfs/gtfs-loader.class';
import { printJourneys } from '@lib/utils/print-journeys.function';
import * as fs from 'node:fs';
import * as path from 'node:path';

const bootstrap = async () => {
    const sourceStopId = process.argv[2];
    const targetStopId = process.argv[3];
    const date = process.argv[4];
    const time = process.argv[5];

    if (!sourceStopId || !targetStopId || !date || !time) {
        console.error('Invalid arguments! Usage: CMD <sourceStopId> <targetStopId> <date> <time>');
        process.exit(1);
    }

    const loader = new GtfsLoader();
    const gtfs = loader.load(path.join(__dirname, '..', '..', 'etc'));

    const collector = new RaptorCollector();

    await collector.loadDataset({
        source: fs.createReadStream(path.resolve(__dirname, '..', '..', 'etc', 'dataset.json')),
    });

    const raptor = new Raptor({
        maxRounds: 6,
        maxDays: 1,
        dataset: collector.getDataset(),
    });

    console.time('Planing phase');
    const journeys = raptor.plan({
        sourceStopId,
        targetStopId,
        date,
        time,
    });
    console.timeEnd('Planing phase');

    printJourneys(journeys, gtfs);
};

bootstrap();
