
"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/context/AppContext";
import { X } from 'lucide-react';

interface TakaDetailCardProps {
    takaNumber: string;
    onClear: () => void;
}

const DetailRow = ({ label, value }: { label: string, value: string | undefined | null }) => (
    value ? (
        <div className="flex justify-between text-sm">
            <p className="text-muted-foreground">{label}:</p>
            <p className="font-medium">{value}</p>
        </div>
    ) : null
);

export function TakaDetailCard({ takaNumber, onClear }: TakaDetailCardProps) {
    const { state } = useAppContext();
    const { productionEntries, deliveryEntries } = state;

    const takaDetails = useMemo(() => {
        const production = productionEntries.find(p => p.takaNumber === takaNumber);
        const delivery = deliveryEntries.find(d => d.takaNumber === takaNumber);
        if (!production) return null;

        return {
            ...production,
            partyName: delivery?.partyName,
            deliveryDate: delivery?.deliveryDate,
            lotNumber: delivery?.lotNumber,
            isDelivered: !!delivery,
        };
    }, [takaNumber, productionEntries, deliveryEntries]);

    if (!takaDetails) {
        return (
            <Card className="mx-2">
                <CardHeader className="flex flex-row items-center justify-between p-2">
                    <CardTitle className="text-base">Taka Details</CardTitle>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClear}>
                        <X className="h-4 w-4"/>
                    </Button>
                </CardHeader>
                <CardContent className="p-2">
                    <p className="text-center text-muted-foreground">Taka number "{takaNumber}" not found.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="mx-2">
            <CardHeader className="flex flex-row items-center justify-between p-2">
                <div>
                    <CardTitle className="text-base">Taka Details: {takaDetails.takaNumber}</CardTitle>
                    <CardDescription className={takaDetails.isDelivered ? "text-red-500" : "text-green-600"}>
                        {takaDetails.isDelivered ? `Delivered` : 'In Stock'}
                    </CardDescription>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClear}>
                    <X className="h-4 w-4"/>
                </Button>
            </CardHeader>
            <CardContent className="p-2 space-y-1">
                <DetailRow label="Production Date" value={takaDetails.date} />
                <DetailRow label="Machine Number" value={takaDetails.machineNumber} />
                <DetailRow label="Meter" value={takaDetails.meter} />
                <hr className="my-1"/>
                <DetailRow label="Delivery Date" value={takaDetails.deliveryDate} />
                <DetailRow label="Party Name" value={takaDetails.partyName} />
                <DetailRow label="Lot Number" value={takaDetails.lotNumber} />
            </CardContent>
        </Card>
    );
}
