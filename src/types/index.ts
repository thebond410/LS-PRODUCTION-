export type ProductionEntry = {
  takaNumber: string;
  machineNumber: string;
  meter: string;
  date: string;
};

export type DeliveryEntry = {
  id: string;
  partyName: string;
  lotNumber: string;
  deliveryDate: string;
  takaNumber: string;
};

export interface Settings {
  supabaseUrl: string;
  supabaseKey: string;
  productionTables: number;
  listTakaRanges: {
    list1: { start: string; end: string };
    list2: { start: string; end: string };
    list3: { start: string; end: string };
  };
}
