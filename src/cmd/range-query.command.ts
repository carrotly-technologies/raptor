import * as fs from 'node:fs';
import * as path from 'node:path';
import { RaptorCollector } from '../algo/raptor-collector.class';
import { Raptor } from '../algo/raptor.class';
import { GtfsLoader } from '../gtfs/gtfs-loader.class';
import { printJourneys } from '../utils/print-journeys.function';

const bootstrap = async () => {
    const sourceStopId = process.argv[2];
    const targetStopId = process.argv[3];
    const date = process.argv[4];

    if (!sourceStopId || !targetStopId || !date) {
        console.error('Invalid arguments! Usage: CMD <sourceStopId> <targetStopId> <date>');
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
    const journeys = raptor.range({
        sourceStopId,
        targetStopId,
        date,
    });
    console.timeEnd('Planing phase');

    printJourneys(journeys, gtfs);
};

bootstrap().catch(console.error);
