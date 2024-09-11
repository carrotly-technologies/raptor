import { Raptor } from '@lib/algo/raptor.class';
import { loadGTFS } from '@lib/gtfs/load-gtfs.function';
import * as assert from 'node:assert';
import * as path from 'node:path';
import * as util from 'node:util';
import { before, describe, it } from 'node:test';
import { RaptorTime } from '@lib/utils/raptor-time.class';

describe(Raptor.name, () => {
    let raptor: Raptor;

    before(() => {
        const gtfs = loadGTFS(path.join(__dirname, '..', '..', 'etc'));

        raptor = new Raptor();
        raptor.load({ ...gtfs, maxTransfers: 100, maxDays: 3 });
    });

    it('should find a journey with zero transfers', (t) => {
        const journeys = raptor.plan({
            sourceStopId: '1355067',
            targetStopId: '1014871',
            date: '2024-09-06',
            time: '09:00:00',
        });

        assert.deepStrictEqual(journeys, [
            {
                segments: [
                    {
                        tripId: '21570519_7952',
                        sourceStopId: '1355067',
                        targetStopId: '1014871',
                        departureTime: 35700,
                        arrivalTime: 36600,
                    },
                ],
                departureTime: 35700,
                arrivalTime: 36600,
            },
        ]);
    });

    it('should find a journey with one transfer', () => {
        const journeys = raptor.plan({
            sourceStopId: '1355067',
            targetStopId: '824745',
            date: '2024-09-06',
            time: '09:00:00',
        });

        assert.deepStrictEqual(journeys, [
            {
                segments: [
                    {
                        tripId: '21570519_7952',
                        sourceStopId: '1355067',
                        targetStopId: '1014871',
                        departureTime: 35700,
                        arrivalTime: 36600
                    },
                    {
                        tripId: undefined,
                        sourceStopId: '1014871',
                        targetStopId: '1536334',
                        departureTime: 36600,
                        arrivalTime: 36781
                    },
                    {
                        tripId: '21251520_7952',
                        sourceStopId: '1536334',
                        targetStopId: '824745',
                        departureTime: 42060,
                        arrivalTime: 42780
                    },
                ],
                departureTime: 35700,
                arrivalTime: 42780,
            },
        ]);
    });

    it.skip('should find a journey with two transfers', () => {
        const journeys = raptor.plan({
            sourceStopId: '???',
            targetStopId: '???',
            date: '???',
            time: '???',
        });

        assert.deepStrictEqual(journeys, []);
    });

    it.skip('should find a journey with three transfers', () => {
        const journeys = raptor.plan({
            sourceStopId: '1014894',
            targetStopId: '1450689',
            date: '2024-09-06',
            time: '13:30:00',
        });

        assert.deepStrictEqual(journeys, []);
    });

    it.skip('should find a journey with four transfers', () => {
        const journeys = raptor.plan({
            sourceStopId: '1014894',
            targetStopId: '1450689',
            date: '2024-09-06',
            time: '17:15:00',
        });

        assert.deepStrictEqual(journeys, []);
    });

    it.skip('should find a journey with five transfers', () => {
        const journeys = raptor.plan({
            sourceStopId: '???',
            targetStopId: '???',
            date: '???',
            time: '???',
        });

        assert.deepStrictEqual(journeys, []);
    });

    it('should find a journeys in range', () => {
        const journeys = raptor.range({
            sourceStopId: '1014894',
            targetStopId: '1450689',
            date: '2024-09-13',
        });

        assert.equal(journeys.length, 4);

        assert.equal(journeys[0].departureTime, 27600);
        assert.equal(journeys[0].arrivalTime, 61860);

        assert.equal(journeys[1].departureTime, 48600);
        assert.equal(journeys[1].arrivalTime, 87000);

        assert.equal(journeys[2].departureTime, 62100);
        assert.equal(journeys[2].arrivalTime, 116700);

        assert.equal(journeys[3].departureTime, 70800);
        assert.equal(journeys[3].arrivalTime, 123900);
    });
});
