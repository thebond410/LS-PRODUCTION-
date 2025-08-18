
"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/context/AppContext";
import { Package, Truck, AlertCircle, Search } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { TakaDetailCard } from "@/components/dashboard/taka-detail-card";

export default function DashboardPage() {
  const { state } = useAppContext();
  const { productionEntries, deliveryEntries } = state;
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedTaka, setSearchedTaka] = useState<string | null>(null);

  const deliveredTakaNumbers = new Set(deliveryEntries.map(d => d.takaNumber));
  const totalProduction = productionEntries.length;
  const totalDelivered = deliveredTakaNumbers.size;
  const pendingDelivery = totalProduction - totalDelivered;

  const data = [
    { name: "Production", value: totalProduction, fill: "hsl(var(--primary))" },
    { name: "Delivered", value: totalDelivered, fill: "hsl(var(--accent))" },
  ];

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setSearchedTaka(searchQuery.trim());
    }
  };

  return (
    <div className="space-y-2">
      <header className="px-2 pt-2">
        <h1 className="text-xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Overview of your production status.</p>
      </header>
      
      <Card className="mx-2">
        <CardContent className="p-2">
           <div className="flex gap-2">
              <Input 
                placeholder="Search Taka Number..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} size="icon">
                <Search className="h-4 w-4" />
              </Button>
           </div>
        </CardContent>
      </Card>

      {searchedTaka && <TakaDetailCard takaNumber={searchedTaka} onClear={() => setSearchedTaka(null)} />}

      <div className="grid grid-cols-2 gap-2 px-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 pb-1">
            <CardTitle className="text-sm font-medium">Total Production</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-2 pt-0">
            <div className="text-2xl font-bold">{totalProduction}</div>
            <p className="text-xs text-muted-foreground">takas recorded</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 pb-1">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-2 pt-0">
            <div className="text-2xl font-bold">{totalDelivered}</div>
            <p className="text-xs text-muted-foreground">takas shipped</p>
          </CardContent>
        </Card>
        <Card className="col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 pb-1">
            <CardTitle className="text-sm font-medium">Pending Delivery</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-2 pt-0">
            <div className="text-2xl font-bold">{pendingDelivery}</div>
            <p className="text-xs text-muted-foreground">takas in stock</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mx-2">
        <CardHeader className="p-2">
          <CardTitle className="text-base">Production vs Delivery</CardTitle>
        </CardHeader>
        <CardContent className="p-2 pt-0">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false}/>
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
