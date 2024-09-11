import { safe } from '@lib/utils/safe.function';
import * as fs from 'node:fs';

export const checkIfFileExists = (filepath: string) => {
    const { error } = safe(() => fs.accessSync(filepath, fs.constants.F_OK));
    return !error;
};
