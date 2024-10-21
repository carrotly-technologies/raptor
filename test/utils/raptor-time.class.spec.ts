import * as assert from 'node:assert';
import { describe, it } from 'node:test';
import { RaptorTime } from 'src/main';

describe(RaptorTime.name, () => {
    it('should create a new instance from a number', () => {
        const time = RaptorTime.from(36600);

        assert.strictEqual(time.toString(), '10:10:00');
    });

    it('should create a new instance from a string', () => {
        const time = RaptorTime.from('10:10:00');

        assert.strictEqual(time.toString(), '10:10:00');
    });

    it('should transform to a number', () => {
        const time = RaptorTime.from('10:10:00');

        assert.strictEqual(time.toNumber(), 36600);
    });

    it('should transform to a string', () => {
        const time = RaptorTime.from(36600);

        assert.strictEqual(time.toString(), '10:10:00');
    });
});
