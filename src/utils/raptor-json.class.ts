import { replacer } from './replacer.function';
import { reviver } from './reviver.function';

export class RaptorJSON {
    static stringify(data: any): string {
        return JSON.stringify(data, replacer);
    }

    static parse(data: string): any {
        return JSON.parse(data, reviver);
    }
}
