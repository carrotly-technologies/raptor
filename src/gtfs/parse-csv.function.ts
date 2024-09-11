import * as fs from 'node:fs';

export const parseCSV = (filepath: string): Record<string, string>[] => {
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
};
