
"use client";

import { useState, useMemo } from "react";
import { useAppContext } from "@/context/AppContext";
import { ProductionEntry } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilePenLine, Trash2, Check, X, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type SortKey = keyof ProductionEntry | 'status' | '';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'stock' | 'all';

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

const formatMeter = (meter: string) => {
    const num = parseFloat(meter);
    if (isNaN(num)) return meter;
    if (num % 1 === 0) {
        return num.toString();
    }
    return num.toFixed(2);
};

export function ProductionList() {
  const { state, dispatch } = useAppContext();
  const { settings, productionEntries, deliveryEntries } = state;
  const { productionTables, listTakaRanges } = settings;
  const [selectedList, setSelectedList] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>('stock');

  const [editingTaka, setEditingTaka] = useState<string | null>(null);
  const [editedEntry, setEditedEntry] = useState<ProductionEntry | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>('takaNumber');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const deliveryMap = useMemo(() => {
    const map = new Map();
    deliveryEntries.forEach(d => map.set(d.takaNumber, d));
    return map;
  }, [deliveryEntries]);

  const allProductionWithDeliveryInfo = useMemo(() => {
    return productionEntries.map(p => {
        const deliveryInfo = deliveryMap.get(p.takaNumber);
        return {
            ...p,
            isDelivered: !!deliveryInfo,
            partyName: deliveryInfo?.partyName,
            lotNumber: deliveryInfo?.lotNumber,
            deliveryDate: deliveryInfo?.deliveryDate,
        }
    })
  }, [productionEntries, deliveryMap]);
  
  const displayedEntries = useMemo(() => {
    if (viewMode === 'stock') {
      return allProductionWithDeliveryInfo.filter(p => !p.isDelivered);
    }
    return allProductionWithDeliveryInfo;
  }, [allProductionWithDeliveryInfo, viewMode]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const handleEditClick = (entry: ProductionEntry) => {
    setEditingTaka(entry.takaNumber);
    setEditedEntry(JSON.parse(JSON.stringify(entry)));
  };

  const handleCancelClick = () => {
    setEditingTaka(null);
    setEditedEntry(null);
  };

  const handleSaveClick = () => {
    if (editedEntry) {
      dispatch({ type: 'UPDATE_PRODUCTION_ENTRY', payload: editedEntry });
      handleCancelClick();
    }
  };
  
  const handleDeleteClick = (takaNumber: string) => {
    if (window.confirm(`Are you sure you want to delete Taka ${takaNumber}? This will also remove any associated delivery record.`)) {
      dispatch({ type: 'DELETE_PRODUCTION_ENTRY', payload: takaNumber });
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (editedEntry) {
      setEditedEntry({ ...editedEntry, [e.target.name]: e.target.value });
    }
  };

  const sortedEntries = useMemo(() => {
    let entries = [...displayedEntries];
    if (sortKey) {
      entries.sort((a, b) => {
        const aValue = sortKey === 'status' ? a.isDelivered : a[sortKey as keyof ProductionEntry];
        const bValue = sortKey === 'status' ? b.isDelivered : b[sortKey as keyof ProductionEntry];

        if (sortKey === 'takaNumber' || sortKey === 'machineNumber' || sortKey === 'meter') {
            const numA = parseFloat(String(aValue).replace(/[^0-9.]/g, '')) || 0;
            const numB = parseFloat(String(bValue).replace(/[^0-9.]/g, '')) || 0;
            return (numA - numB) * (sortDirection === 'asc' ? 1 : -1);
        }
        
        if(sortKey === 'status') {
            return (aValue === bValue ? 0 : aValue ? 1 : -1) * (sortDirection === 'asc' ? 1 : -1);
        }

        if (sortKey === 'date') {
            const dateA = new Date(String(aValue).split('/').reverse().join('-'));
            const dateB = new Date(String(bValue).split('/').reverse().join('-'));
            if(isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
            return (dateA.getTime() - dateB.getTime()) * (sortDirection === 'asc' ? 1 : -1);
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
       entries.sort((a,b) => parseFloat(b.takaNumber) - parseFloat(a.takaNumber));
    }
    return entries;
  }, [displayedEntries, sortKey, sortDirection]);

  const allTableData = Array.from({ length: productionTables }, (_, i) => {
    const listKey = `list${i + 1}` as keyof typeof listTakaRanges;
    const range = listTakaRanges[listKey];
    const listEntries = filterEntriesByRange(sortedEntries, range.start, range.end);
    
    // Calculate totals based on the view mode
    const stockEntries = listEntries.filter(e => !e.isDelivered);
    const totalTakas = viewMode === 'stock' ? stockEntries.length : listEntries.length;
    const totalMeters = (viewMode === 'stock' ? stockEntries : listEntries)
        .reduce((sum, entry) => sum + (parseFloat(entry.meter) || 0), 0);

    return {
      title: `List ${i + 1}`,
      entries: listEntries,
      totalTakas: totalTakas,
      totalMeters: totalMeters.toFixed(2),
    }
  });

  const tableData = selectedList === "all" 
    ? allTableData 
    : allTableData.filter((_, index) => `list${index + 1}` === selectedList);

  if (productionEntries.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-10">
        <p>No production entries yet.</p>
        <p className="text-sm">Click 'Add Entry' to start.</p>
      </div>
    );
  }

  const renderCellContent = (entry: ProductionEntry, field: keyof ProductionEntry) => {
    const isEditing = editingTaka === entry.takaNumber && editedEntry;
    
    if (isEditing) {
      return (
        <Input
          name={field}
          value={editedEntry![field]}
          onChange={handleInputChange}
          className="h-5 p-1 text-[10px] font-bold"
          disabled={field === 'takaNumber'}
        />
      );
    }
    
    if (field === 'meter') {
        return formatMeter(entry.meter);
    }
    
    return entry[field];
  };
  
  const SortableHeader = ({ sortKeyName, label, className }: { sortKeyName: SortKey, label: string, className?: string }) => (
    <TableHead className={cn("p-[2px] text-[10px] font-bold h-6 cursor-pointer", className)} onClick={() => handleSort(sortKeyName)}>
        <div className="flex items-center">
            {label}
            {sortKey === sortKeyName && <ArrowUpDown className="ml-1 h-3 w-3" />}
        </div>
    </TableHead>
  );

  return (
    <TooltipProvider>
    <div className="space-y-2">
      <div className="px-2 grid grid-cols-2 gap-2">
        <Select value={selectedList} onValueChange={setSelectedList}>
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Select a list" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Lists</SelectItem>
            {Array.from({ length: productionTables }).map((_, i) => (
              <SelectItem key={i} value={`list${i + 1}`}>List {i + 1}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
            <SelectTrigger className="h-8">
                <SelectValue placeholder="Select View" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="stock">Stock Only</SelectItem>
                <SelectItem value="all">All Production</SelectItem>
            </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[2px] px-[2px]">
        {tableData.map((data, index) => (
          <Card key={index} className="flex flex-col">
            <CardHeader className="p-2">
              <CardTitle className="text-base">{data.title}</CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-grow">
              {data.entries.length > 0 ? (
                <ScrollArea className="h-[calc(100vh-250px)]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <SortableHeader sortKeyName="takaNumber" label="Taka" className="w-[15%]" />
                        <SortableHeader sortKeyName="meter" label="Meter" className="w-[15%]" />
                        <TableHead className="p-[2px] text-[10px] font-bold h-6 w-[50%]">Party / Lot</TableHead>
                        <TableHead className="p-[2px] text-[10px] font-bold text-right h-6 w-[20%]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.entries.map((entry) => (
                        <TableRow key={entry.takaNumber} className={cn("m-[2px] h-6", { 'bg-red-100 text-red-700 font-bold': entry.isDelivered })}>
                          <TableCell className="p-[2px] text-[10px] font-bold truncate max-w-0">
                             <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>{renderCellContent(entry, 'takaNumber')}</span>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" align="start">
                                  <p>M/C: {entry.machineNumber}</p>
                                  <p>Date: {entry.date}</p>
                                   {entry.isDelivered && <p>Del. Date: {entry.deliveryDate}</p>}
                                </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell className="p-[2px] text-[10px] font-bold">{renderCellContent(entry, 'meter')}</TableCell>
                           <TableCell className="p-[2px] text-[10px] font-bold truncate max-w-0">
                           {entry.isDelivered ? `${entry.partyName} / ${entry.lotNumber}` : '-'}
                          </TableCell>
                          <TableCell className="p-[2px] text-right">
                            {editingTaka === entry.takaNumber ? (
                              <>
                                <Button variant="ghost" size="icon" className="h-5 w-5 text-green-600" onClick={handleSaveClick}>
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={handleCancelClick}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleEditClick(entry)}>
                                  <FilePenLine className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => handleDeleteClick(entry.takaNumber)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                          <TableCell className="p-1 text-[12px] font-bold h-8">Total</TableCell>
                          <TableCell className="p-1 text-[12px] font-bold h-8">{data.totalTakas}</TableCell>
                          <TableCell className="p-1 text-[12px] font-bold h-8"></TableCell>
                          <TableCell className="p-1 text-[12px] font-bold h-8">{data.totalMeters}</TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </ScrollArea>
              ) : (
                <p className="text-muted-foreground text-xs text-center py-4">
                  No entries for this list or view.
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
    </TooltipProvider>
  );
}
