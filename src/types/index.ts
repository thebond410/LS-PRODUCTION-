
export type ProductionEntry = {
  id?: number; // Optional: for database use
  takaNumber: string;
  machineNumber: string;
  meter: string;
  date: string;
};

export type DeliveryEntry = {
  id: string; // Using string to accommodate local-first (ISOString) and db-first (number) IDs
  partyName: string;
  lotNumber: string;
  deliveryDate: string;
  takaNumber: string;
  meter: string;
  machineNumber: string;
  tpNumber?: number;
};

export interface Settings {
  scanApiKey?: string;
  supabaseUrl: string;
  supabaseKey: string;
  productionTables: number;
  maxMachineNumber: number; // Added this line
  listTakaRanges: {
    list1: { start: string; end: string };
    list2: { start: string; end: string };
    list3: { start: string; end: string };
  };
}
