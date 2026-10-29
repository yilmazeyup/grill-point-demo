import type { Station } from './menu';

/** The kitchen team of the demo. Every name here is made up; Grill-Point's real team is not named anywhere. */
export type StaffId = 'kerem' | 'mert' | 'sevda' | 'ayla' | 'joep' | 'bilal' | 'mats';

export type Staff = {
  id: StaffId;
  name: string;
  role: string;
  /** Where they stand in the 3D kitchen. */
  station: Station | 'kassa' | 'weg';
  courier?: boolean;
  /** Apron or jacket colour in 3D. */
  colour: string;
  line?: string;
};

export const TEAM: Staff[] = [
  { id: 'kerem', name: 'Kerem', role: 'Grillmeester', station: 'grill', colour: '#1B1512', line: 'Komt aan tafel voor de Mix Grill' },
  { id: 'mert', name: 'Mert', role: 'Döner & pizza', station: 'spit', colour: '#C8341E' },
  { id: 'ayla', name: 'Ayla', role: 'Bakplaat & friteuse', station: 'plancha', colour: '#C8341E' },
  { id: 'sevda', name: 'Sevda', role: 'Kassa & bediening', station: 'kassa', colour: '#F2A93B' },
  { id: 'joep', name: 'Joep', role: 'Bezorger', station: 'weg', courier: true, colour: '#E0321B' },
  { id: 'bilal', name: 'Bilal', role: 'Bezorger', station: 'weg', courier: true, colour: '#E0321B' },
  { id: 'mats', name: 'Mats', role: 'Bezorger', station: 'weg', courier: true, colour: '#E0321B' },
];

export const staff = (id: StaffId) => TEAM.find((s) => s.id === id) ?? TEAM[0];

export const COURIERS = TEAM.filter((s) => s.courier);

/** The cook at each station, for the Grill-Cam's caption. */
export const COOK_AT: Record<Station, StaffId> = {
  grill: 'kerem',
  spit: 'mert',
  oven: 'mert',
  plancha: 'ayla',
  fryer: 'ayla',
  pass: 'sevda',
  cold: 'sevda',
};

/** Tables: four inside, three on the terrace in front (the red chairs on Instagram). */
export const TABLES = [
  { n: 1, zone: 'binnen', seats: 4 },
  { n: 2, zone: 'binnen', seats: 2 },
  { n: 3, zone: 'binnen', seats: 4 },
  { n: 4, zone: 'binnen', seats: 6 },
  { n: 5, zone: 'terras', seats: 4 },
  { n: 6, zone: 'terras', seats: 4 },
  { n: 7, zone: 'terras', seats: 2 },
] as const;

export type TableNo = (typeof TABLES)[number]['n'];
