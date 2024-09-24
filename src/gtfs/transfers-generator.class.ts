import { GenerateArgs, LoadArgs, Stop, Transfer } from '@lib/gtfs/transfers-generator.types';
import { calculateHaversineDistance } from '@lib/utils/calculate-haversine-distance.function';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';
import * as fs from 'node:fs';

export class TransfersGenerator {
    private stops: Stop[] = [];

    public async load(args: LoadArgs): Promise<void> {
        return new Promise((resolve, reject) => {
            const sources = Array.isArray(args.source) ? args.source : [args.source];

            sources.forEach((source) => {
                const stream = fs.createReadStream(source);

                const parser = parse({
                    columns: true,
                    skipEmptyLines: true,
                });

                stream
                    .pipe(parser)
                    .on('data', (row) =>
                        this.stops.push({
                            stopId: row['stop_id'],
                            stopLat: Number(row['stop_lat']),
                            stopLon: Number(row['stop_lon']),
                        }),
                    )
                    .on('end', resolve)
                    .on('error', reject);
            });
        });
    }

    public async generate(args: GenerateArgs): Promise<void> {
        return new Promise((resolve, reject) => {
            const transfers: Transfer[] = [];
            const maxWalkingDistance = args.maxWalkingTime * args.avgWalkingSpeed;

            this.stops.forEach((sourceStop) => {
                this.stops.forEach((targetStop) => {
                    if (sourceStop.stopId === targetStop.stopId) return;

                    const walkingDistance = calculateHaversineDistance(
                        sourceStop.stopLat,
                        sourceStop.stopLon,
                        targetStop.stopLat,
                        targetStop.stopLon,
                    );

                    if (walkingDistance > maxWalkingDistance) return;

                    const walkingTime = Math.ceil(walkingDistance / args.avgWalkingSpeed);

                    transfers.push({
                        fromStopId: sourceStop.stopId,
                        toStopId: targetStop.stopId,
                        transferType: 2,
                        minTransferTime: walkingTime,
                    });
                });
            });

            const columns = {
                fromStopId: 'from_stop_id',
                toStopId: 'to_stop_id',
                transferType: 'transfer_type',
                minTransferTime: 'min_transfer_time',
            };

            stringify(transfers, { header: true, columns })
                .pipe(fs.createWriteStream(args.target))
                .on('finish', resolve)
                .on('error', reject);
        });
    }
}
