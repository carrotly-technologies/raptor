import * as path from 'path';
import { checkIfFileExists } from '../utils/check-if-file-exists.function';
import { fromEntries } from '../utils/from-entries.function';
import { GTFS } from './gtfs.types';
import { parseCSV } from './parse-csv.function';

export const loadGTFS = (dirpath: string): GTFS => {
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
            const value = checkIfFileExists(filepath) ? parseCSV(filepath) : [];
            return [key, value];
        }),
    );

    return data;
};
