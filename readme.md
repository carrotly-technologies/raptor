# Raptor

The Raptor package provides a high-performance implementation of the RAPTOR (Real-time Algorithm for Public Transit Optimization and Routing) algorithm for efficient transit planning and routing. Designed to work with GTFS (General Transit Feed Specification) data, Raptor helps developers build transit applications that require optimized route planning.

Our implementation includes optimizations described in the documentation, such as local and target pruning, and stop marking. Additionally, we have incorporated features not directly mentioned in the original paper, including:

- Trips follows the schedule defined in calendar.txt and calendar_dates.txt.
- Trips from following days can be considered if there are no more trips available on the given day.
- Journey reconstruction to provide detailed information about the planned journey.

## Installation

Install the package with one of the following commands:

```bash
npm add @carrotly-technologies/raptor
pnpm add @carrotly-technologies/raptor
yarn add @carrotly-technologies/raptor
```

## Usage

### GTFS Requirements

The Raptor package assumes that GTFS files have been extracted from a zip archive. The minimum required GTFS files are:

- `trips.txt`
- `stops.txt`
- `stop_times.txt`
- `calendar.txt`
- `calendar_dates.txt`

Additionally, if you need to include footpaths (transfers), you can provide an `transfers.txt` file.

### Loading GTFS

You can load your GTFS data using the GtfsLoader class. The load method takes the path to your GTFS files and returns the data needed for the Raptor algorithm:

```javascript
const { GtfsLoader } = require('@carrotly-technologies/raptor');

const loader = new GtfsLoader();
const gtfs = loader.load('/path/to/gtfs/files');
```

### Configuring Raptor

The Raptor class allows you to configure the algorithm with the following parameters:

- `maxRounds`: The maximum number of rounds the algorithm will perform.
- `maxDays`: The maximum number of days forward the algorithm will look for trips if there are no more trips available on the given day.

You can then load the GTFS data into the Raptor instance:

```javascript
const { Raptor } = require('@carrotly-technologies/raptor');

const raptor = new Raptor();

raptor.load({ ...gtfs, maxRounds: 10, maxDays: 2 });
```

### Simple Queries

To plan a journey between two stops at a specific date and time:

```javascript
const journey = raptor.plan({
    sourceStopId: '123',
    targetStopId: '456',
    date: '2024-01-01',
    time: '08:00:00',
});
```

### Range Queries

To find all journeys for a given date between two stops:

```javascript
const journeys = raptor.range({
    sourceStopId: '123',
    targetStopId: '456',
    date: '2024-01-01',
})
```

### Results

The plan and range methods return an array of journeys. Each journey contains the following properties:

- `departureTime`: The departure time of the journey.
- `arrivalTime`: The arrival time of the journey.
- `segments`: An array of segments that make up the journey.

Each segment contains the following properties:

- `tripId`: The ID of the trip or undefined if it is a footpath.
- `sourceStopId`: The ID of the source stop.
- `targetStopId`: The ID of the target stop.
- `departureTime`: The departure time of the segment.
- `arrivalTime`: The arrival time of the segment.

## Contributing

For major changes, please open an issue first to discuss what you would like to change. Please make sure to update tests and documentation as appropriate.

## License

This project is licensed under the MIT License - see the [LICENSE](./license.md) file for details.
