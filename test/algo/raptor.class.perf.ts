import { RaptorV1 } from '@lib/algo/raptor-v1.class';
import { RaptorV2 } from '@lib/algo/raptor-v2.class';
import { GtfsLoader } from '@lib/gtfs/gtfs-loader.class';
import * as path from 'node:path';
import * as bench from 'benchmark';

const loader = new GtfsLoader();
const gtfs = loader.load(path.join(__dirname, '..', '..', 'etc'));

const raptorV1 = new RaptorV1({
    maxRounds: 6,
    maxDays: 1
});
const raptorV2 = new RaptorV2({
    maxRounds: 6,
    maxDays: 1
});

raptorV1.load({ ...gtfs });
raptorV2.load({ ...gtfs });

new bench.Suite('journeys with at least 0 transfers')
    .add(RaptorV1.name, () => {
        raptorV1.plan({
            sourceStopId: '1355067',
            targetStopId: '1014871',
            date: '2024-09-06',
            time: '09:00:00',
        });
    })
    .add(RaptorV2.name, () => {
        raptorV2.plan({
            sourceStopId: '1355067',
            targetStopId: '1014871',
            date: '2024-09-06',
            time: '09:00:00',
        });
    })
    .on('cycle', (e) => console.log(String(e.target)))
    .on('complete', function () { console.log('Fastest is ' + this.filter('fastest').map('name')) })
    .run();

new bench.Suite('journeys with at least 3 transfers')
    .add(RaptorV1.name, () => {
        raptorV1.plan({
            sourceStopId: '1491097',
            targetStopId: '80416',
            date: '2024-09-14',
            time: '12:00:00',
        });
    })
    .add(RaptorV2.name, () => {
        raptorV2.plan({
            sourceStopId: '1491097',
            targetStopId: '80416',
            date: '2024-09-14',
            time: '12:00:00',
        });
    })
    .on('cycle', (e) => console.log(String(e.target)))
    .on('complete', function () { console.log('Fastest is ' + this.filter('fastest').map('name')) })
    .run();

new bench.Suite('journeys with range queries')
    .add(RaptorV1.name, () => {
        raptorV1.range({
            sourceStopId: '1014894',
            targetStopId: '1450689',
            date: '2024-09-13',
        });
    })
    .add(RaptorV2.name, () => {
        raptorV2.range({
            sourceStopId: '1014894',
            targetStopId: '1450689',
            date: '2024-09-13',
        });
    })
    .on('cycle', (e) => console.log(String(e.target)))
    .on('complete', function () { console.log('Fastest is ' + this.filter('fastest').map('name')) })
    .run();