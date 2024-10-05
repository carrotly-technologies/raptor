import { RaptorCollector } from '@lib/algo/raptor-collector.class';
import * as fs from 'node:fs';
import * as path from 'node:path';

const bootstrap = async () => {
    const collector = new RaptorCollector();

    console.time('Loading phase');
    await collector.loadGtfs({
        stops: [fs.createReadStream(path.resolve(__dirname, '..', '..', 'etc', 'stops.txt'))],
        stopTimes: [fs.createReadStream(path.resolve(__dirname, '..', '..', 'etc', 'stop_times.txt'))],
        trips: [fs.createReadStream(path.resolve(__dirname, '..', '..', 'etc', 'trips.txt'))],
        calendars: [fs.createReadStream(path.resolve(__dirname, '..', '..', 'etc', 'calendar.txt'))],
        calendarDates: [fs.createReadStream(path.resolve(__dirname, '..', '..', 'etc', 'calendar_dates.txt'))],
    });
    console.timeEnd('Loading phase');

    console.time('Building phase');
    collector.buildDataset({ footpaths: true, avgWalkingSpeed: 1.33, maxWalkingTime: 300 });
    console.timeEnd('Building phase');

    const target = fs.createWriteStream(path.resolve(__dirname, '..', '..', 'etc', 'dataset.json'));
    await collector.saveDataset({ target });
};

bootstrap().catch(console.error);
