export interface ProjectAssemblyRequirement {
  itemId: string;
  amount: number;
}

export interface ProjectAssemblyPhase {
  id: number;
  name: string;
  tiersUnlocked: number[];
  requirements: ProjectAssemblyRequirement[];
}

export const ProjectAssemblyPhases: ProjectAssemblyPhase[] = [
  {
    id: 1,
    name: 'Distribution Platform',
    tiersUnlocked: [3, 4],
    requirements: [{ itemId: 'Desc_SpaceElevatorPart_1_C', amount: 50 }],
  },
  {
    id: 2,
    name: 'Construction Dock',
    tiersUnlocked: [5, 6],
    requirements: [
      { itemId: 'Desc_SpaceElevatorPart_1_C', amount: 1000 },
      { itemId: 'Desc_SpaceElevatorPart_2_C', amount: 1000 },
      { itemId: 'Desc_SpaceElevatorPart_3_C', amount: 100 },
    ],
  },
  {
    id: 3,
    name: 'Main Body',
    tiersUnlocked: [7, 8],
    requirements: [
      { itemId: 'Desc_SpaceElevatorPart_2_C', amount: 2500 },
      { itemId: 'Desc_SpaceElevatorPart_4_C', amount: 500 },
      { itemId: 'Desc_SpaceElevatorPart_5_C', amount: 100 },
    ],
  },
  {
    id: 4,
    name: 'Propulsion',
    tiersUnlocked: [9],
    requirements: [
      { itemId: 'Desc_SpaceElevatorPart_7_C', amount: 500 },
      { itemId: 'Desc_SpaceElevatorPart_6_C', amount: 500 },
      { itemId: 'Desc_SpaceElevatorPart_8_C', amount: 250 },
      { itemId: 'Desc_SpaceElevatorPart_9_C', amount: 100 },
    ],
  },
  {
    id: 5,
    name: 'Assembly',
    tiersUnlocked: [],
    requirements: [
      { itemId: 'Desc_SpaceElevatorPart_9_C', amount: 1000 },
      { itemId: 'Desc_SpaceElevatorPart_10_C', amount: 1000 },
      { itemId: 'Desc_SpaceElevatorPart_12_C', amount: 256 },
      { itemId: 'Desc_SpaceElevatorPart_11_C', amount: 200 },
    ],
  },
];
