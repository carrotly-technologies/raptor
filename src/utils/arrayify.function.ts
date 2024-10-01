export const arrayify = <T>(data: T | T[]): T[] => {
    return Array.isArray(data) ? data : [data];
}