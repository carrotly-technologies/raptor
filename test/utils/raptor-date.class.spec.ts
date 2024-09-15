import { RaptorDate } from '@lib/utils/raptor-date.class';
import * as assert from 'node:assert';
import { describe, it } from 'node:test';

describe(RaptorDate.name, () => {
    it('should create a new instance from a number', () => {
        const date = RaptorDate.from(20240906);

        assert.strictEqual(date.toString(), '2024-09-06');
    });

    it('should create a new instance from a string', () => {
        const date = RaptorDate.from('2024-09-06');

        assert.strictEqual(date.toString(), '2024-09-06');
    });

    it('should transform to a number', () => {
        const date = RaptorDate.from('2024-09-06');

        assert.strictEqual(date.toNumber(), 20240906);
    });

    it('should transform to a string', () => {
        const date = RaptorDate.from(20240906);

        assert.strictEqual(date.toString(), '2024-09-06');
    });
});
