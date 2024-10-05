export const reviver = (key: string, value: any) => {
    if (typeof value === 'object' && value !== null && '__type__' in value && value['__type__'] === 'Map') {
        return new Map(value.entries);
    }

    return value;
};
