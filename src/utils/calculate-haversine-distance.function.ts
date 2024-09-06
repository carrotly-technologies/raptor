const RadiusOfEarthInMeters = 6371000;

export const calculateHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const b = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return RadiusOfEarthInMeters * b;
};
