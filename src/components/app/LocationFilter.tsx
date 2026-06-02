import { useState } from "react";
import { MapPin, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NIGERIA_STATES } from "@/lib/nigeria";
import { cn } from "@/lib/utils";

export type LocationValue = { state?: string; lga?: string };

export function LocationFilter({ value, onChange }: { value: LocationValue; onChange: (v: LocationValue) => void }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState(value.state ?? "");
  const [lga, setLga] = useState(value.lga ?? "");
  const active = !!(value.state || value.lga);
  const label = active ? [value.lga, value.state].filter(Boolean).join(", ") : "Location";
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap border flex items-center gap-1.5 transition",
            active ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border",
          )}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span className="truncate max-w-[140px]">{label}</span>
          {active && (
            <X
              className="w-3.5 h-3.5 ml-0.5 opacity-80"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onChange({}); setState(""); setLga(""); }}
            />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3" align="start">
        <div>
          <label className="text-xs font-medium text-muted-foreground">State</label>
          <Select value={state} onValueChange={setState}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Any state" /></SelectTrigger>
            <SelectContent className="max-h-64">
              {NIGERIA_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">LGA</label>
          <Input className="mt-1" placeholder="e.g. Oredo" value={lga} onChange={(e) => setLga(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => { setState(""); setLga(""); onChange({}); setOpen(false); }}>Clear</Button>
          <Button className="flex-1" onClick={() => { onChange({ state: state || undefined, lga: lga.trim() || undefined }); setOpen(false); }}>Apply</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}