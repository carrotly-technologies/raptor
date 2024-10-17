import { replacer } from '@lib/utils/replacer.function';
import { reviver } from '@lib/utils/reviver.function';

export class RaptorJSON {
    static stringify(data: any): string {
        return JSON.stringify(data, replacer);
    }

    static parse(data: string): any {
        return JSON.parse(data, reviver);
    }
}
