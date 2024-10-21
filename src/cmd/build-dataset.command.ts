import { RaptorCollector } from '@lib/algo/raptor-collector.class';
import { parse } from 'csv-parse';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as stream from 'node:stream';
import * as gtfs from '@lib/gtfs/gtfs.types';

const bootstrap = async () => {
    const collector = new RaptorCollector();

    const process = <T>(stream: stream.Readable) => {
        const results: T[] = [];

        return new Promise<T[]>((resolve, reject) => {
            stream
                .pipe(parse({ columns: true }))
                .on('data', (data) => results.push(data))
                .on('error', (error) => reject(error))
                .on('end', () => resolve(results));
        });
    };

    const stops = await process<gtfs.Stop>(fs.createReadStream(path.resolve(__dirname, '..', '..', 'etc', 'stops.txt')));
    const stopTimes = await process<gtfs.StopTime>(fs.createReadStream(path.resolve(__dirname, '..', '..', 'etc', 'stop_times.txt')));
    const trips = await process<gtfs.Trip>(fs.createReadStream(path.resolve(__dirname, '..', '..', 'etc', 'trips.txt')));
    const calendars = await process<gtfs.Calendar>(fs.createReadStream(path.resolve(__dirname, '..', '..', 'etc', 'calendar.txt')));
    const calendarDates = await process<gtfs.CalendarDate>(fs.createReadStream(path.resolve(__dirname, '..', '..', 'etc', 'calendar_dates.txt')));

    console.time('Loading phase');
    await collector.loadGtfs({ stops, stopTimes, trips, calendars, calendarDates });
    console.timeEnd('Loading phase');

    console.time('Building phase');
    collector.buildDataset({ footpaths: true, avgWalkingSpeed: 1.33, maxWalkingTime: 300 });
    console.timeEnd('Building phase');

    const target = fs.createWriteStream(path.resolve(__dirname, '..', '..', 'etc', 'dataset.json'));
    await collector.saveDataset({ target });
};

bootstrap().catch(console.error);
