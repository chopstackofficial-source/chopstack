import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import logo from "@/assets/logo.png";

const links = [
  { to: "/menu", label: "Menu" },
  { to: "/story", label: "Story" },
  { to: "/visit", label: "Visit" },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-background/70 backdrop-blur-md border-b border-border/60">
      <div className="mx-auto max-w-7xl px-5 md:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <img src={logo} alt="CHOPSTACK" className="h-9 w-9" />
          <span className="font-display text-xl tracking-wide">CHOPSTACK</span>
        </Link>
        <nav className="hidden md:flex items-center gap-10">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="nav-link text-sm uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors" activeProps={{ className: "text-foreground" }}>
              {l.label}
            </Link>
          ))}
        </nav>
        <button className="md:hidden p-2 -mr-2" aria-label="Menu" onClick={() => setOpen((o) => !o)}>
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {open && (
        <nav className="md:hidden border-t border-border bg-background px-5 py-8 flex flex-col gap-6 animate-in fade-in slide-in-from-top-2">
          {links.map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="font-display text-5xl uppercase">
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border mt-24">
      <div className="mx-auto max-w-7xl px-5 md:px-8 py-14 grid gap-10 md:grid-cols-3 items-end">
        <div>
          <div className="font-display leading-none" style={{ fontSize: "clamp(1.9rem, 9.5vw, 4.5rem)" }}>CHOPSTACK</div>
          <div className="mt-3 text-xs md:text-sm uppercase tracking-[0.2em] md:tracking-[0.3em] text-primary">Noodles · Pasta · Plantain · Protein</div>
        </div>
        <div className="flex gap-8 text-sm uppercase tracking-[0.2em] text-muted-foreground">
          {links.map((l) => <Link key={l.to} to={l.to} className="hover:text-foreground">{l.label}</Link>)}
        </div>
        <div className="flex flex-wrap md:justify-end gap-x-6 gap-y-2 text-sm uppercase tracking-[0.2em]">
          <a href="https://www.facebook.com/chopstack1" target="_blank" rel="noreferrer" className="hover:text-primary">Facebook</a>
          <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-primary">Instagram</a>
          <a href="https://tiktok.com" target="_blank" rel="noreferrer" className="hover:text-primary">TikTok</a>
          <a href="https://x.com" target="_blank" rel="noreferrer" className="hover:text-primary">X</a>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-5 md:px-8 pb-8 text-xs text-muted-foreground">
        <a href="mailto:chopstackofficial@gmail.com" className="hover:text-foreground break-all">chopstackofficial@gmail.com</a>
        <span className="mx-2">·</span>
        © {new Date().getFullYear()} CHOPSTACK. Made in Nigeria.
      </div>
    </footer>
  );
}
