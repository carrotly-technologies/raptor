interface FootpathBuilder {
    load(args: { source: string }): FootpathBuilder;
    build(): FootpathBuilder;
    save(args: { target: string }): void;
    get(): { sourceStopId: string, targetStopId: string, walkingTime: number }[];
}

interface IndexBuilder {
    load(args: { source: string }): IndexBuilder;
    build(): IndexBuilder;
    save(args: { target: string }): void;
    get(): { stops: any[], routes: any[], stopRoutes: any[], routeStops: any[], stopTimes: any[], footpaths: any[], services: any[] };
}

interface Raptor {
    load(args: { source: string } | { stops: any[], routes: any[], stopRoutes: any[], routeStops: any[], stopTimes: any[], footpaths: any[], services: any[] }): void;
    plan(args: { sourceStopId: string, targetStopId: string, date: string, time: string }): any;
    range(args: { sourceStopId: string, targetStopId: string, date: string }): any;
}

// With intermediate files

const fb = {} as unknown as FootpathBuilder;
fb.load({ source: 'file://gtfs/stops.txt' });
fb.build();
fb.save({ target: 'file://gtfs/footpaths.txt' });

const ib = {} as unknown as IndexBuilder;
ib.load({ source: 'file://gtfs' });
ib.build();
ib.save({ target: 'file://indexes' });

const raptor = {} as unknown as Raptor;
raptor.load({ source: 'file://indexes' });
raptor.plan({ sourceStopId: '1', targetStopId: '2', date: '2022-01-01', time: '08:00' });

// Without intermediate files

const ib = {} as unknown as IndexBuilder;
const idxs = ib.load({ source: 'file://gtfs' }).build().get();

raptor.load(idxs);
raptor.plan({ sourceStopId: '1', targetStopId: '2', date: '2022-01-01', time: '08:00' });


