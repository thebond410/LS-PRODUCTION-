"use client";

import { useAppContext } from "@/context/AppContext";
import { ProductionEntry } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";

const filterEntriesByRange = (entries: ProductionEntry[], start?: string, end?: string) => {
  if (!start || !end) return entries;
  const startNum = parseInt(start, 10);
  const endNum = parseInt(end, 10);
  if (isNaN(startNum) || isNaN(endNum)) return entries;

  return entries.filter(entry => {
    const takaNum = parseInt(entry.takaNumber, 10);
    return !isNaN(takaNum) && takaNum >= startNum && takaNum <= endNum;
  });
};

export function ProductionList() {
  const { state } = useAppContext();
  const { settings, productionEntries, deliveryEntries } = state;
  const { productionTables, listTakaRanges } = settings;

  const deliveredTakaNumbers = new Set(deliveryEntries.map(d => d.takaNumber));

  const tableData = Array.from({ length: productionTables }, (_, i) => {
    const listKey = `list${i + 1}` as keyof typeof listTakaRanges;
    const range = listTakaRanges[listKey];
    return filterEntriesByRange(productionEntries, range.start, range.end);
  });

  if (productionEntries.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-10">
        <p>No production entries yet.</p>
        <p className="text-sm">Click 'Add Entry' to start.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tableData.map((entries, index) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle>List {index + 1}</CardTitle>
          </CardHeader>
          <CardContent>
            {entries.length > 0 ? (
              <ul className="space-y-3">
                {entries.map((entry) => (
                  <li
                    key={entry.takaNumber}
                    className={cn(
                      "p-3 rounded-md border flex flex-col transition-colors",
                      deliveredTakaNumbers.has(entry.takaNumber)
                        ? "border-destructive/50 bg-destructive/10"
                        : "bg-card"
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <div className="font-bold text-lg">
                        Taka: <span className={cn(deliveredTakaNumbers.has(entry.takaNumber) ? 'text-destructive' : 'text-primary')}>{entry.takaNumber}</span>
                      </div>
                      {deliveredTakaNumbers.has(entry.takaNumber) && (
                        <Badge variant="destructive">Delivered</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground grid grid-cols-3 gap-2 mt-2">
                        <div><span className="font-medium">Date:</span> {entry.date}</div>
                        <div><span className="font-medium">Machine:</span> {entry.machineNumber}</div>
                        <div><span className="font-medium">Meter:</span> {entry.meter}</div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-4">
                No entries for this list.
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
