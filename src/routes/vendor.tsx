import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileShell } from "@/components/app/BottomNav";
export const Route = createFileRoute("/vendor")({ component: () => (
  <MobileShell>
    <div className="p-6 text-center space-y-3">
      <h1 className="text-lg font-bold">Vendor</h1>
      <p className="text-sm text-muted-foreground">This screen is being built in the next phase.</p>
      <Link to="/" className="text-primary">Back home</Link>
    </div>
  </MobileShell>
) });
