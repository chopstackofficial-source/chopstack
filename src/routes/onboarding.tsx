import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sprout, Users, ShoppingBasket } from "lucide-react";
import { ThemeToggle } from "@/components/app/ThemeToggle";

export const Route = createFileRoute("/onboarding")({ component: Onboarding });

const features = [
  { icon: Sprout, title: "Fresh from the farm", body: "Buy direct from farmers near you." },
  { icon: Users, title: "Split & save together", body: "Join group buys and share the savings." },
  { icon: ShoppingBasket, title: "Curated kitchen bundles", body: "Stock your kitchen in one tap." },
];

function Onboarding() {
  const navigate = useNavigate();
  const finish = () => {
    localStorage.setItem("cs_onboarded", "1");
    navigate({ to: "/signup" });
  };
  return (
    <div className="min-h-screen flex flex-col bg-background p-6 max-w-md mx-auto">
      <div className="flex justify-end">
        <ThemeToggle />
      </div>
      <div className="flex-1 flex flex-col justify-center">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-2">Welcome to CHOPSTACK</h1>
          <p className="text-muted-foreground">Fresh produce, smarter buying.</p>
        </div>
        <div className="space-y-5">
          {features.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex items-start gap-4">
              <div className="w-12 h-12 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Button size="lg" onClick={finish}>Get Started</Button>
    </div>
  );
}