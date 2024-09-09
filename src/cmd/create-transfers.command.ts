import * as fs from 'fs';
import { parseCSV } from '../gtfs/parse-csv.function';
import { calculateHaversineDistance } from '../utils/calculate-haversine-distance.function';
import { checkIfFileExists } from '../utils/check-if-file-exists.function';

const bootstrap = () => {
    const stopsPath = process.argv[2];
    const transfersPath = process.argv[3];

    if (!stopsPath || !transfersPath || !checkIfFileExists(stopsPath)) {
        console.error('Invalid arguments!');
        process.exit(1);
    }

    const stops = parseCSV(stopsPath);
    const walkingSpeed = 1.33;
    const maxWalkingTime = 5 * 60;
    const maxWalkingDistance = maxWalkingTime * walkingSpeed;

    const transfers: string[] = [];

    stops.forEach((sourceStop) => {
        stops.forEach((targetStop) => {
            if (sourceStop['stop_id'] === targetStop['stop_id']) return;

            const walkingDistance = calculateHaversineDistance(
                Number(sourceStop['stop_lat']),
                Number(sourceStop['stop_lon']),
                Number(targetStop['stop_lat']),
                Number(targetStop['stop_lon']),
            );

            if (walkingDistance > maxWalkingDistance) return;

            const walkingTime = Math.ceil(walkingDistance / walkingSpeed);
            transfers.push(`${sourceStop['stop_id']},${targetStop['stop_id']},2,${walkingTime}`);
        });
    });

    const header = 'from_stop_id,to_stop_id,transfer_type,min_transfer_time';
    fs.writeFileSync(transfersPath, `${header}\n${transfers.join('\n')}`);
};

bootstrap();
