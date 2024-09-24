export interface LoadArgs {
    source: string | string[];
}

export interface GenerateArgs {
    target: string;
    maxWalkingTime: number;
    avgWalkingSpeed: number;
}

export interface Stop {
    stopId: string;
    stopLat: number;
    stopLon: number;
}

export interface Transfer {
    fromStopId: string;
    toStopId: string;
    transferType: number;
    minTransferTime: number;
}
