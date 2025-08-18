
"use client";

import { useState, useMemo } from "react";
import { DateRange } from "react-day-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppContext } from "@/context/AppContext";
import { ProductionEntry, DeliveryEntry } from "@/types";
import { Calendar as CalendarIcon, FileText } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type ReportType = "production" | "delivery" | "stock" | "";

export default function ReportPage() {
  const { state } = useAppContext();
  const { productionEntries, deliveryEntries } = state;
  
  const [date, setDate] = useState<DateRange | undefined>();
  const [reportType, setReportType] = useState<ReportType>("");
  const [machineNumber, setMachineNumber] = useState<string>("all");
  const [generatedReport, setGeneratedReport] = useState<{ type: ReportType; data: any[], totalTakas: number, totalMeters: string } | null>(null);

  const availableMachineNumbers = useMemo(() => {
    const numbers = new Set(productionEntries.map(e => e.machineNumber));
    return Array.from(numbers).sort((a,b) => parseInt(a) - parseInt(b));
  }, [productionEntries]);


  const handleGenerateReport = () => {
    if (!reportType) {
      alert("Please select a report type.");
      return;
    }

    let filteredData: (ProductionEntry | DeliveryEntry)[] = [];
    const deliveredTakaNumbers = new Set(deliveryEntries.map(d => d.takaNumber));

    if (reportType === 'production') {
      filteredData = productionEntries;
    } else if (reportType === 'delivery') {
      filteredData = deliveryEntries;
    } else if (reportType === 'stock') {
      filteredData = productionEntries.filter(p => !deliveredTakaNumbers.has(p.takaNumber));
    }
    
    if (date?.from && date?.to) {
       filteredData = filteredData.filter(entry => {
        const entryDateStr = 'date' in entry ? entry.date : entry.deliveryDate;
        if (!entryDateStr) return false;
        
        const dateParts = entryDateStr.split('/');
        if (dateParts.length !== 3) return false;
        const entryDate = new Date(`20${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
        
        const fromDate = new Date(date.from!);
        fromDate.setHours(0,0,0,0);
        const toDate = new Date(date.to!);
        toDate.setHours(23,59,59,999);

        return entryDate >= fromDate && entryDate <= toDate;
      });
    }

    if (machineNumber && machineNumber !== 'all' && reportType !== 'delivery') {
      filteredData = filteredData.filter(entry => 'machineNumber' in entry && entry.machineNumber === machineNumber);
    }
    
    const totalTakas = filteredData.length;
    const totalMeters = filteredData.reduce((sum, entry) => sum + (parseFloat(entry.meter) || 0), 0).toFixed(2);


    setGeneratedReport({ type: reportType, data: filteredData, totalTakas, totalMeters });
  };

  const renderProductionReport = (data: ProductionEntry[], totalTakas: number, totalMeters: string) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="font-bold text-sky-600">Taka No.</TableHead>
          <TableHead className="font-bold text-red-600">Machine</TableHead>
          <TableHead className="font-bold text-green-600">Meter</TableHead>
          <TableHead className="font-bold text-purple-600">Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((entry, index) => (
          <TableRow key={index}>
            <TableCell>{entry.takaNumber}</TableCell>
            <TableCell>{entry.machineNumber}</TableCell>
            <TableCell>{entry.meter}</TableCell>
            <TableCell>{entry.date}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell className="font-bold">Total</TableCell>
          <TableCell></TableCell>
          <TableCell className="font-bold">{totalMeters}</TableCell>
          <TableCell className="font-bold">{totalTakas}</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );

  const renderDeliveryReport = (data: DeliveryEntry[], totalTakas: number, totalMeters: string) => (
     <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="font-bold text-purple-600">Date</TableHead>
          <TableHead className="font-bold text-sky-600">Taka No.</TableHead>
          <TableHead className="font-bold text-green-600">Meter</TableHead>
          <TableHead className="font-bold text-blue-600">Party</TableHead>
          <TableHead className="font-bold text-orange-600">Lot</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell>{entry.deliveryDate}</TableCell>
            <TableCell>{entry.takaNumber}</TableCell>
            <TableCell>{entry.meter}</TableCell>
            <TableCell>{entry.partyName}</TableCell>
            <TableCell>{entry.lotNumber}</TableCell>
          </TableRow>
        ))}
      </TableBody>
       <TableFooter>
        <TableRow>
          <TableCell className="font-bold">Total</TableCell>
          <TableCell className="font-bold">{totalTakas}</TableCell>
          <TableCell className="font-bold">{totalMeters}</TableCell>
          <TableCell colSpan={2}></TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );

  const renderStockReport = (data: ProductionEntry[], totalTakas: number, totalMeters: string) => (
     <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="font-bold text-sky-600">Taka No.</TableHead>
          <TableHead className="font-bold text-red-600">Machine</TableHead>
          <TableHead className="font-bold text-green-600">Meter</TableHead>
          <TableHead className="font-bold text-purple-600">Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((entry, index) => (
          <TableRow key={index}>
            <TableCell>{entry.takaNumber}</TableCell>
            <TableCell>{entry.machineNumber}</TableCell>
            <TableCell>{entry.meter}</TableCell>
            <TableCell>{entry.date}</TableCell>
          </TableRow>
        ))}
      </TableBody>
       <TableFooter>
        <TableRow>
          <TableCell className="font-bold">Total</TableCell>
          <TableCell></TableCell>
          <TableCell className="font-bold">{totalMeters}</TableCell>
          <TableCell className="font-bold">{totalTakas}</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );


  return (
    <div className="space-y-2">
      <header className="px-2 pt-2">
        <h1 className="text-xl font-bold text-gray-800">Reports</h1>
        <p className="text-muted-foreground text-sm">Generate and view reports.</p>
      </header>

      <Card className="mx-2">
        <CardHeader className="p-2">
          <CardTitle className="text-base">Filter Options</CardTitle>
        </CardHeader>
        <CardContent className="p-2 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                 <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                        "w-full h-8 justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                        date.to ? (
                            <>
                            {format(date.from, "LLL dd, y")} -{" "}
                            {format(date.to, "LLL dd, y")}
                            </>
                        ) : (
                            format(date.from, "LLL dd, y")
                        )
                        ) : (
                        <span>Pick a date range</span>
                        )}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={setDate}
                        numberOfMonths={2}
                    />
                    </PopoverContent>
                </Popover>

                <Select onValueChange={(value) => setReportType(value as ReportType)} value={reportType}>
                <SelectTrigger className="h-8">
                    <SelectValue placeholder="Filter by Type" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="production">Production Wise</SelectItem>
                    <SelectItem value="delivery">Delivery Wise</SelectItem>
                    <SelectItem value="stock">Stock Wise</SelectItem>
                </SelectContent>
                </Select>

                <Select onValueChange={setMachineNumber} value={machineNumber} disabled={reportType === 'delivery'}>
                <SelectTrigger className="h-8">
                    <SelectValue placeholder="Filter by Machine" />
                </SelectTrigger>
                <SelectContent>
                     <SelectItem value="all">All Machines</SelectItem>
                    {availableMachineNumbers.map(mc => (
                        <SelectItem key={mc} value={mc}>Machine {mc}</SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>
            <Button onClick={handleGenerateReport} className="w-full h-9">Generate Report</Button>
        </CardContent>
      </Card>
      
      <Card className="mx-2">
        <CardContent className="p-0">
           {generatedReport ? (
             generatedReport.data.length > 0 ? (
                <ScrollArea className="h-[calc(100vh-280px)]">
                    {generatedReport.type === 'production' && renderProductionReport(generatedReport.data as ProductionEntry[], generatedReport.totalTakas, generatedReport.totalMeters)}
                    {generatedReport.type === 'delivery' && renderDeliveryReport(generatedReport.data as DeliveryEntry[], generatedReport.totalTakas, generatedReport.totalMeters)}
                    {generatedReport.type === 'stock' && renderStockReport(generatedReport.data as ProductionEntry[], generatedReport.totalTakas, generatedReport.totalMeters)}
                </ScrollArea>
             ) : (
                <div className="text-center text-muted-foreground py-10">
                    <p>No data available for the selected filters.</p>
                </div>
             )
            ) : (
                <div className="text-center text-muted-foreground py-10">
                    <FileText className="mx-auto h-12 w-12" />
                    <h3 className="mt-2 text-sm font-medium">No report generated</h3>
                    <p className="mt-1 text-sm">Select filters above to generate a report.</p>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
