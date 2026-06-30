import { Department } from '../../common/enums/department.enum';

export type AssignmentLocationSeed = {
  locationNumber: string;
  name: string;
  parentLocationNumber: string | null;
  department?: Department | null;
  capacity?: number | null;
  openHours?: {
    type: 'ALWAYS_OPEN' | 'RECURRING';
    days?: number[];
    startTime?: string;
    endTime?: string;
  } | null;
};

const monFriNineToSix = {
  type: 'RECURRING' as const,
  days: [1, 2, 3, 4, 5],
  startTime: '09:00',
  endTime: '18:00',
};

const monSatNineToSix = {
  type: 'RECURRING' as const,
  days: [1, 2, 3, 4, 5, 6],
  startTime: '09:00',
  endTime: '18:00',
};

const monSunNineToSix = {
  type: 'RECURRING' as const,
  days: [1, 2, 3, 4, 5, 6, 7],
  startTime: '09:00',
  endTime: '18:00',
};

const alwaysOpen = {
  type: 'ALWAYS_OPEN' as const,
};

/** Assignment sample location tree (15 nodes). */
export const ASSIGNMENT_LOCATIONS: AssignmentLocationSeed[] = [
  { locationNumber: 'A', name: 'Building A', parentLocationNumber: null },
  { locationNumber: 'B', name: 'Building B', parentLocationNumber: null },
  { locationNumber: 'A-01', name: 'Floor 1', parentLocationNumber: 'A' },
  { locationNumber: 'B-05', name: 'Floor 5', parentLocationNumber: 'B' },
  {
    locationNumber: 'A-01-Lobby',
    name: 'Lobby Level1',
    parentLocationNumber: 'A-01',
  },
  {
    locationNumber: 'A-01-01',
    name: 'Meeting Room 1',
    parentLocationNumber: 'A-01',
    department: Department.EFM,
    capacity: 10,
    openHours: monFriNineToSix,
  },
  {
    locationNumber: 'A-01-02',
    name: 'Meeting Room 2',
    parentLocationNumber: 'A-01',
    department: Department.FSS,
    capacity: 50,
    openHours: monFriNineToSix,
  },
  {
    locationNumber: 'A-01-Corridor',
    name: 'Corridor Floor 1',
    parentLocationNumber: 'A-01',
  },
  {
    locationNumber: 'A-01-03',
    name: 'Meeting Room 2',
    parentLocationNumber: 'A-01',
    department: Department.AVS,
    capacity: 5,
    openHours: monSatNineToSix,
  },
  {
    locationNumber: 'B-05-11',
    name: 'Utility Room',
    parentLocationNumber: 'B-05',
    department: Department.ASS,
    capacity: 30,
    openHours: alwaysOpen,
  },
  {
    locationNumber: 'B-05-12',
    name: 'Sanitary Room',
    parentLocationNumber: 'B-05',
    department: Department.EFM,
    capacity: 10,
    openHours: monFriNineToSix,
  },
  {
    locationNumber: 'B-05-13',
    name: 'Meeting Toilet',
    parentLocationNumber: 'B-05',
    department: Department.EFM,
    capacity: 10,
    openHours: monFriNineToSix,
  },
  {
    locationNumber: 'B-05-14',
    name: 'Genset Room',
    parentLocationNumber: 'B-05',
    department: Department.ASS,
    capacity: 100,
    openHours: monSunNineToSix,
  },
  {
    locationNumber: 'B-05-15',
    name: 'Pantry Floor 5',
    parentLocationNumber: 'B-05',
  },
  {
    locationNumber: 'B-05-Corridor',
    name: 'Corridor Floor 5',
    parentLocationNumber: 'B-05',
  },
];

export const ASSIGNMENT_LOCATION_NUMBERS = ASSIGNMENT_LOCATIONS.map(
  (row) => row.locationNumber,
);
