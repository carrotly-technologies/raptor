import * as fs from 'node:fs';
import { safe } from './safe.function';

export const checkIfFileExists = (filepath: string) => {
    const { error } = safe(() => fs.accessSync(filepath, fs.constants.F_OK));
    return !error;
};
