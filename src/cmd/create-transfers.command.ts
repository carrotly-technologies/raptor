import { RaptorCollector } from '@lib/algo/raptor-collector.class';
import { TransfersGenerator } from '@lib/gtfs/transfers-generator.class';
import { RaptorV2 } from '@lib/algo/raptor-v2.class';
import * as path from 'node:path';

const bootstrap = async () => {
    const GTFS_URLS = [
        path.join(__dirname, '..', '..', 'etc', 'gtfs-buses.zip'),
        'http://localhost:9000/public/gtfs-trains.zip',
    ];

    const LOCAL_INDEXES_URL = path.join(__dirname, '..', '..', 'etc', 'index.json');
    const REMOTE_INDEXES_URL = 'http://localhost:9000/public/index.json';

    const collector = new RaptorCollector();

    console.time('Collector loading phase');
    await collector.load({ url: GTFS_URLS });
    console.timeEnd('Collector loading phase');

    console.time('Collector building phase');
    collector.build({ avgWalkingSpeed: 1.33, maxWalkingTime: 300, });
    console.timeEnd('Collector building phase');

    console.time('Collector saving to local file system phase');
    collector.save({ url: LOCAL_INDEXES_URL });
    console.timeEnd('Collector saving to local file system phase');

    console.time('Collector saving to remote file system phase');
    collector.save({ url: REMOTE_INDEXES_URL });
    console.timeEnd('Collector saving to remote file system phase');

    const index = collector.get();

    // const raptor = new RaptorV2({
    //     maxRounds: 10,
    //     maxDays: 2,
    // });

    // raptor.load({ url: INDEXES_URL })
    // raptor.plan({ sourceStopId: '8503000', targetStopId: '8503003', date: '2024-10-01', time: '09:00:00' });
    // raptor.range({ sourceStopId: '8503000', targetStopId: '8503003', date: '2024-10-01' });

    // const generator = new TransfersGenerator();

    // await generator.load({ source: path.join(__dirname, '..', '..', 'etc', 'stops.txt') });

    // await generator.generate({
    //     target: path.join(__dirname, '..', '..', 'etc', 'transfers.txt'),
    //     maxWalkingTime: 5 * 60,
    //     avgWalkingSpeed: 1.33,
    // });

    // const stopsPath = process.argv[2];
    // const transfersPath = process.argv[3];

    // if (!stopsPath || !transfersPath || !checkIfFileExists(stopsPath)) {
    //     console.error('Invalid arguments! Usage: CMD <stopsPath> <transfersPath>');
    //     process.exit(1);
    // }

    // const stops = new GtfsLoader().parse(stopsPath);
    // const walkingSpeed = 1.33;
    // const maxWalkingTime = 5 * 60;
    // const maxWalkingDistance = maxWalkingTime * walkingSpeed;

    // const transfers: string[] = [];

    // stops.forEach((sourceStop) => {
    //     stops.forEach((targetStop) => {
    //         if (sourceStop['stop_id'] === targetStop['stop_id']) return;

    //         const walkingDistance = calculateHaversineDistance(
    //             Number(sourceStop['stop_lat']),
    //             Number(sourceStop['stop_lon']),
    //             Number(targetStop['stop_lat']),
    //             Number(targetStop['stop_lon']),
    //         );

    //         if (walkingDistance > maxWalkingDistance) return;

    //         const walkingTime = Math.ceil(walkingDistance / walkingSpeed);
    //         transfers.push(`${sourceStop['stop_id']},${targetStop['stop_id']},2,${walkingTime}`);
    //     });
    // });

    // const header = 'from_stop_id,to_stop_id,transfer_type,min_transfer_time';
    // fs.writeFileSync(transfersPath, `${header}\n${transfers.join('\n')}`);
};

bootstrap().catch(console.error);
