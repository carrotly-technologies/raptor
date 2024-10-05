export const replacer = (key: string, value: any) => {
    if (value instanceof Map) {
        return {
            __type__: 'Map',
            entries: Array.from(value.entries()),
        };
    }

    return value;
};
