import { ProductionEntryOptions } from "@/components/production/production-entry-options";
import { ProductionList } from "@/components/production/production-list";

export default function ProductionPage() {
  return (
    <div className="space-y-4">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Production</h1>
          <p className="text-muted-foreground">Manage your production entries.</p>
        </div>
        <ProductionEntryOptions />
      </header>
      <ProductionList />
    </div>
  );
}
