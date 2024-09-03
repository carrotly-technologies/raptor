export type SafeResult<T> = { data: T; error: undefined } | { data: undefined; error: any };

export const safe = <T>(fn: () => T): SafeResult<T> => {
    try {
        const data = fn();
        return { data, error: undefined };
    } catch (error) {
        return { data: undefined, error };
    }
};

export const safeAsync = async <T>(fn: () => Promise<T>): Promise<SafeResult<T>> => {
    try {
        const data = await fn();
        return { data, error: undefined };
    } catch (error) {
        return { data: undefined, error };
    }
};
