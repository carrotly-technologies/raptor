import { RaptorCollector } from '@lib/algo/raptor-collector.class';
import { Raptor } from '@lib/algo/raptor.class';
import * as bench from 'benchmark';
import * as fs from 'node:fs';
import * as path from 'node:path';

const benchmark = async () => {
    const collector = new RaptorCollector();
    await collector.loadDataset({
        source: fs.createReadStream(path.resolve(__dirname, '..', '..', 'etc', 'dataset.json')),
    });

    const raptor = new Raptor({
        maxRounds: 6,
        maxDays: 1,
        dataset: collector.getDataset(),
    });

    new bench.Suite('journeys with at least 0 transfers')
        .add(Raptor.name, () => {
            raptor.plan({
                sourceStopId: '1355067',
                targetStopId: '1014871',
                date: '2024-09-06',
                time: '09:00:00',
            });
        })
        .on('cycle', (e) => console.log(String(e.target)))
        .on('complete', function () {
            console.log('Fastest is ' + this.filter('fastest').map('name'));
        })
        .run();

    new bench.Suite('journeys with at least 3 transfers')
        .add(Raptor.name, () => {
            raptor.plan({
                sourceStopId: '1491097',
                targetStopId: '80416',
                date: '2024-09-14',
                time: '12:00:00',
            });
        })
        .on('cycle', (e) => console.log(String(e.target)))
        .on('complete', function () {
            console.log('Fastest is ' + this.filter('fastest').map('name'));
        })
        .run();

    new bench.Suite('journeys with range queries')
        .add(Raptor.name, () => {
            raptor.range({
                sourceStopId: '1014894',
                targetStopId: '1450689',
                date: '2024-09-13',
            });
        })
        .on('cycle', (e) => console.log(String(e.target)))
        .on('complete', function () {
            console.log('Fastest is ' + this.filter('fastest').map('name'));
        })
        .run();
};

benchmark().catch(console.error);
