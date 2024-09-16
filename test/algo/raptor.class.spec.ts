import { Raptor } from '@lib/algo/raptor.class';
import { loadGTFS } from '@lib/gtfs/load-gtfs.function';
import * as assert from 'node:assert';
import * as path from 'node:path';
import { before, describe, it } from 'node:test';

describe(Raptor.name, () => {
    let raptor: Raptor;

    before(() => {
        const gtfs = loadGTFS(path.join(__dirname, '..', '..', 'etc'));

        raptor = new Raptor();
        raptor.load({ ...gtfs, maxRounds: 10, maxDays: 1 });
    });

    describe('journeys with at least 0 transfers', () => {
        it('should find a journey from 1355067 to 1014871 at 09:00 on 2024-09-06', () => {
            const journeys = raptor.plan({
                sourceStopId: '1355067',
                targetStopId: '1014871',
                date: '2024-09-06',
                time: '09:00:00',
            });

            assert.equal(journeys.length, 1);

            assert.equal(journeys[0].departureTime, 35700);
            assert.equal(journeys[0].arrivalTime, 36600);
            assert.equal(journeys[0].segments.length, 1);
            assert.equal(journeys[0].segments[0].tripId, '21570519_7952');
        });

        it('should find a journey from 235879 to 241960 at 12:00 on 2024-09-16', () => {
            const journeys = raptor.plan({
                sourceStopId: '235879',
                targetStopId: '241960',
                date: '2024-09-16',
                time: '12:00:00',
            });

            assert.equal(journeys.length, 1);

            assert.equal(journeys[0].departureTime, 44220);
            assert.equal(journeys[0].arrivalTime, 46860);
            assert.equal(journeys[0].segments.length, 1);
            assert.equal(journeys[0].segments[0].tripId, '2023_2024_1512768');
        });
    });

    describe('journeys with at least 1 transfers', () => {
        it('should find a journey from 1355067 to 824745 at 09:00 on 2024-09-06', () => {
            const journeys = raptor.plan({
                sourceStopId: '1355067',
                targetStopId: '824745',
                date: '2024-09-06',
                time: '09:00:00',
            });

            assert.equal(journeys.length, 1);

            assert.equal(journeys[0].departureTime, 35700);
            assert.equal(journeys[0].arrivalTime, 42780);

            assert.equal(journeys[0].segments.length, 3);
            assert.equal(journeys[0].segments[0].tripId, '21570519_7952');
            assert.equal(journeys[0].segments[1].tripId, undefined);
            assert.equal(journeys[0].segments[2].tripId, '21251520_7952');
        });

        it('should find a journey from 64303 to 81679 at 11:00 on 2024-09-23', () => {
            const journeys = raptor.plan({
                sourceStopId: '64303',
                targetStopId: '81679',
                date: '2024-09-23',
                time: '11:00:00',
            });

            assert.equal(journeys.length, 1);

            assert.equal(journeys[0].departureTime, 45660);
            assert.equal(journeys[0].arrivalTime, 65610);

            assert.equal(journeys[0].segments.length, 2);
            assert.equal(journeys[0].segments[0].tripId, '2023_2024_1521086');
            assert.equal(journeys[0].segments[1].tripId, '2023_2024_1522498');
        });
    });

    describe('journeys with at least 2 transfers', () => {
        it('should find a journey from 1491097 to 1450499 at 12:00 on 2024-09-14', () => {
            const journeys = raptor.plan({
                sourceStopId: '1491097',
                targetStopId: '1450499',
                date: '2024-09-14',
                time: '12:00:00',
            });

            assert.equal(journeys.length, 1);

            assert.equal(journeys[0].departureTime, 43860);
            assert.equal(journeys[0].arrivalTime, 70080);
        });

        it('should find a journey from 1450637 to 1271955 at 08:00 on 2024-09-21', () => {
            const journeys = raptor.plan({
                sourceStopId: '1450637',
                targetStopId: '1271955',
                date: '2024-09-21',
                time: '08:00:00',
            });

            assert.equal(journeys.length, 1);

            assert.equal(journeys[0].departureTime, 29580);
            assert.equal(journeys[0].arrivalTime, 67680);

            assert.equal(journeys[0].segments.length, 4);
            assert.equal(journeys[0].segments[0].tripId, '20314459_7953');
            assert.equal(journeys[0].segments[1].tripId, undefined);
            assert.equal(journeys[0].segments[2].tripId, '20017056_7953');
            assert.equal(journeys[0].segments[3].tripId, '21570827_7953');
        });
    });

    describe('journeys with at least 3 transfers', () => {
        it('should find a journey from 1491097 to 80416 at 12:00 on 2024-09-14', () => {
            const journeys = raptor.plan({
                sourceStopId: '1491097',
                targetStopId: '80416',
                date: '2024-09-14',
                time: '12:00:00',
            });

            assert.equal(journeys.length, 2);

            assert.equal(journeys[0].segments.length, 5);
            assert.equal(journeys[0].departureTime, 43860);
            assert.equal(journeys[0].arrivalTime, 113340);

            assert.equal(journeys[1].segments.length, 6);
            assert.equal(journeys[1].departureTime, 43860);
            assert.equal(journeys[1].arrivalTime, 75780);
        });

        it('should find a journey from 824788 to 79806 at 10:00 on 2024-09-29', () => {
            const journeys = raptor.plan({
                sourceStopId: '824788',
                targetStopId: '79806',
                date: '2024-09-29',
                time: '10:00:00',
            });

            assert.equal(journeys.length, 1);

            assert.equal(journeys[0].departureTime, 41820);
            assert.equal(journeys[0].arrivalTime, 110670);

            assert.equal(journeys[0].segments.length, 6);
            assert.equal(journeys[0].segments[0].tripId, '21570837_7954');
            assert.equal(journeys[0].segments[1].tripId, '20017057_7954');
            assert.equal(journeys[0].segments[2].tripId, undefined);
            assert.equal(journeys[0].segments[3].tripId, '20314464_7954');
            assert.equal(journeys[0].segments[4].tripId, undefined);
            assert.equal(journeys[0].segments[5].tripId, '2023_2024_1522229');
        });
    });

    describe('journeys with at least 4 transfers', () => {
        it('should find a journey from 1491097 to 1450689 at 12:00 on 2024-09-14', () => {
            const journeys = raptor.plan({
                sourceStopId: '1491097',
                targetStopId: '1450689',
                date: '2024-09-14',
                time: '12:00:00',
            });

            assert.equal(journeys.length, 2);

            assert.equal(journeys[0].segments.length, 7);
            assert.equal(journeys[0].departureTime, 43860);
            assert.equal(journeys[0].arrivalTime, 123900);

            assert.equal(journeys[1].segments.length, 8);
            assert.equal(journeys[1].departureTime, 43860);
            assert.equal(journeys[1].arrivalTime, 87000);
        });

        it('should find a journey from 1015428 to 824788 at 10:00 on 2024-09-20', () => {
            const journeys = raptor.plan({
                sourceStopId: '1015428',
                targetStopId: '824788',
                date: '2024-09-20',
                time: '10:00:00',
            });

            assert.equal(journeys.length, 1);

            assert.equal(journeys[0].segments.length, 8);
            assert.equal(journeys[0].departureTime, 54600);
            assert.equal(journeys[0].arrivalTime, 135300);

            assert.equal(journeys[0].segments[0].tripId, '21570306_7952');
            assert.equal(journeys[0].segments[1].tripId, undefined);
            assert.equal(journeys[0].segments[2].tripId, '2023_2024_1522498');
            assert.equal(journeys[0].segments[3].tripId, undefined);
            assert.equal(journeys[0].segments[4].tripId, '20314457_7952');
            assert.equal(journeys[0].segments[5].tripId, undefined);
            assert.equal(journeys[0].segments[6].tripId, '20017055_7953');
            assert.equal(journeys[0].segments[7].tripId, '21570826_7953');
        });
    });

    describe('journeys with at least 5 transfers', () => {
        it('should find a journey from 824788 to 1606200 at 10:00 on 2024-09-14', () => {
            const journeys = raptor.plan({
                sourceStopId: '824788',
                targetStopId: '1606200',
                date: '2024-09-14',
                time: '10:00:00',
            });

            assert.equal(journeys.length, 2);

            assert.equal(journeys[0].segments.length, 8);
            assert.equal(journeys[0].departureTime, 41820);
            assert.equal(journeys[0].arrivalTime, 125100);

            assert.equal(journeys[1].segments.length, 9);
            assert.equal(journeys[1].departureTime, 41820);
            assert.equal(journeys[1].arrivalTime, 88200);
        });

        it('should find a journey from 21251506 to 21570826 at 14:00 on 2024-09-20', () => {
            const journeys = raptor.plan({
                sourceStopId: '1657838',
                targetStopId: '824788',
                date: '2024-09-20',
                time: '14:00:00',
            });

            assert.equal(journeys.length, 1);

            assert.equal(journeys[0].segments.length, 10);
            assert.equal(journeys[0].departureTime, 53520);
            assert.equal(journeys[0].arrivalTime, 135300);

            assert.equal(journeys[0].segments[0].tripId, '21251506_7952');
            assert.equal(journeys[0].segments[1].tripId, undefined);
            assert.equal(journeys[0].segments[2].tripId, '2023_2024_1522441');
            assert.equal(journeys[0].segments[3].tripId, undefined);
            assert.equal(journeys[0].segments[4].tripId, '20669979_7952');
            assert.equal(journeys[0].segments[5].tripId, undefined);
            assert.equal(journeys[0].segments[6].tripId, '20314458_7953');
            assert.equal(journeys[0].segments[7].tripId, undefined);
            assert.equal(journeys[0].segments[8].tripId, '20017055_7953');
            assert.equal(journeys[0].segments[9].tripId, '21570826_7953');
        });
    });

    describe('journeys with range queries', () => {
        it('should find a journey from 1014894 to 1450689 on 2024-09-13', () => {
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

        it('should find a journey from 1527743 to 1450618 on 2024-09-28', () => {
            const journeys = raptor.range({
                sourceStopId: '1527743',
                targetStopId: '1450619',
                date: '2024-09-28',
            });

            assert.equal(journeys.length, 2);

            assert.equal(journeys[0].departureTime, 37800);
            assert.equal(journeys[0].arrivalTime, 61380);

            assert.equal(journeys[0].segments.length, 6);
            assert.equal(journeys[0].segments[0].tripId, '20477845_7953');
            assert.equal(journeys[0].segments[1].tripId, undefined);
            assert.equal(journeys[0].segments[2].tripId, '2023_2024_1530057');
            assert.equal(journeys[0].segments[3].tripId, undefined);
            assert.equal(journeys[0].segments[4].tripId, '21570602_7953');
            assert.equal(journeys[0].segments[5].tripId, '18366245_7953');

            assert.equal(journeys[1].departureTime, 66600);
            assert.equal(journeys[1].arrivalTime, 120780);

            assert.equal(journeys[1].segments.length, 6);
            assert.equal(journeys[1].segments[0].tripId, '20477847_7953');
            assert.equal(journeys[1].segments[1].tripId, undefined);
            assert.equal(journeys[1].segments[2].tripId, '2023_2024_1548508');
            assert.equal(journeys[1].segments[3].tripId, undefined);
            assert.equal(journeys[1].segments[4].tripId, '21570607_7953');
            assert.equal(journeys[1].segments[5].tripId, '18366247_7954');
        });
    });
});
