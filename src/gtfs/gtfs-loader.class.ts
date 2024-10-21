import * as fs from 'node:fs';
import * as path from 'node:path';
import { GTFS } from '../gtfs/gtfs.types';
import { checkIfFileExists } from '../utils/check-if-file-exists.function';
import { fromEntries } from '../utils/from-entries.function';

export class GtfsLoader {
    public load(dirpath: string): GTFS {
        const files = [
            { key: 'agency', filename: 'agency.txt' },
            { key: 'routes', filename: 'routes.txt' },
            { key: 'stops', filename: 'stops.txt' },
            { key: 'trips', filename: 'trips.txt' },
            { key: 'stopTimes', filename: 'stop_times.txt' },
            { key: 'transfers', filename: 'transfers.txt' },
            { key: 'calendar', filename: 'calendar.txt' },
            { key: 'calendarDates', filename: 'calendar_dates.txt' },
        ] as const;

        const data = fromEntries(
            files.map(({ key, filename }) => {
                const filepath = path.join(dirpath, filename);
                const value = checkIfFileExists(filepath) ? this.parse(filepath) : [];
                return [key, value];
            }),
        );

        return data;
    }

    public parse(filepath: string): Record<string, string>[] {
        const data = fs.readFileSync(filepath, 'utf8');
        const lines = data.split('\n');

        const headers = lines[0].split(',');
        const records = lines
            .slice(1)
            .filter((line) => !!line)
            .map((line) => {
                const values = line.split(',');
                return headers.reduce((acc, header, i) => {
                    acc[header] = values[i];
                    return acc;
                }, {});
            });

        return records;
    }
}
