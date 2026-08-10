export const LogisticTypes = [
  {
    id: 'Pipe',
    name: 'Pipe',
    imagePath: '/images/game/pipe-mk-1-indicator_64.png',
  },
  {
    id: 'Belt',
    name: 'Belt',
    imagePath: '/images/game/conveyor-mk-1_64.png',
  },
  {
    id: 'Train',
    name: 'Train',
    imagePath: '/images/game/locomotive_64.png',
  },
  {
    id: 'Drone',
    name: 'Drone',
    imagePath: '/images/game/drone_64.png',
  },
  {
    id: 'Vehicle',
    name: 'Vehicle',
    imagePath: '/images/game/tractor_64.png',
  },
] as const;

export type LogisticType = (typeof LogisticTypes)[number]['id'];

export const AllLogisticTypesMap = LogisticTypes.reduce(
  (acc, logisticType) => {
    acc[logisticType.id] = logisticType;
    return acc;
  },
  {} as Record<LogisticType, (typeof LogisticTypes)[number]>,
);
