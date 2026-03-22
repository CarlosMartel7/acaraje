"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GitBranch,
  LayoutDashboard,
  Table2,
  Layers,
  ListTree,
  Sprout,
  PencilRuler,
  ChevronDown,
  Shrimp,
  Cloud,
  FolderOpen,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

const topNavItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, description: "Schema summary" },
  { href: "/schemas", label: "Models", icon: Table2, description: "All Prisma models" },
  { href: "/relations", label: "Relations", icon: GitBranch, description: "Model relationships" },
  { href: "/seeder", label: "Seeder", icon: Sprout, description: "Generate fake data" },
];

const driveSubItems = [
  { href: "/drive", label: "Upload", icon: Upload },
  { href: "/drive/view", label: "View", icon: FolderOpen },
];

export function Sidebar() {
  const pathname = usePathname();
  const [models, setModels] = useState<string[]>([]);
  const [crudOpen, setCrudOpen] = useState(false);
  const [driveOpen, setDriveOpen] = useState(false);

  useEffect(() => {
    fetch("/api/acaraje/schemas")
      .then((r) => r.json())
      .then((d) => setModels(d.models?.map((m: any) => m.name) || []));
  }, []);

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col border-r border-border/60 bg-card/60">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary border border-primary-foreground glow-primary-foreground-sm">
            <Shrimp className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <div className="text-base font-semibold tracking-tight text-foreground">Acaraje</div>
            <div className="text-[10px] font-mono text-muted-foreground/60 tracking-widest uppercase">schema explorer</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
        <p className="px-3 mb-3 text-[10px] font-mono tracking-[0.12em] uppercase text-muted-foreground/40">Explore</p>

        {topNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all duration-150",
                isActive
                  ? "bg-primary border border-primary-foreground/25 text-primary-foreground "
                  : "text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent",
              )}
            >
              <item.icon
                className={cn(
                  "w-4 h-4 flex-shrink-0",
                  isActive ? "text-primary-foreground" : "text-muted-foreground/60 group-hover:text-muted-foreground",
                )}
              />
              <span className="flex-1 font-medium">{item.label}</span>
              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground opacity-80" />}
            </Link>
          );
        })}

        {/* Drive accordion */}
        <div className="pt-1">
          <Button
            variant="ghost"
            onClick={() => setDriveOpen((v) => !v)}
            className={cn(
              "w-full justify-start gap-3 rounded-md px-3 py-2.5 h-auto font-medium",
              pathname.startsWith("/drive")
                ? "bg-primary border border-primary-foreground/25 text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent",
            )}
          >
            <Cloud className="w-4 h-4 flex-shrink-0 text-muted-foreground/60" />
            <span className="flex-1 text-left">Drive</span>
            <ChevronDown
              className={cn("w-3.5 h-3.5 text-muted-foreground/40 transition-transform duration-200", driveOpen && "rotate-180")}
            />
          </Button>

          {driveOpen && (
            <div className="mt-1 ml-4 pl-3 border-l border-border/50 space-y-0.5">
              {driveSubItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 rounded px-2.5 py-1.5 text-xs transition-all",
                      isActive
                        ? "text-primary-foreground bg-primary font-medium"
                        : "text-muted-foreground/70 hover:text-foreground hover:bg-accent",
                    )}
                  >
                    <item.icon className="w-3 h-3 flex-shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* CRUD accordion */}
        <div className="pt-4">
          <p className="px-3 mb-2 text-[10px] font-mono tracking-[0.12em] uppercase text-muted-foreground/40">Data</p>
          <Button
            variant="ghost"
            onClick={() => setCrudOpen((v) => !v)}
            className={cn(
              "w-full justify-start gap-3 rounded-md px-3 py-2.5 h-auto font-medium",
              pathname.startsWith("/crud")
                ? "bg-primary border border-primary-foreground/25 text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent",
            )}
          >
            <PencilRuler className="w-4 h-4 flex-shrink-0 text-muted-foreground/60" />
            <span className="flex-1 text-left">CRUD</span>
            <ChevronDown
              className={cn("w-3.5 h-3.5 text-muted-foreground/40 transition-transform duration-200", crudOpen && "rotate-180")}
            />
          </Button>

          {crudOpen && (
            <div className="mt-1 ml-4 pl-3 border-l border-border/50 space-y-0.5">
              {models.map((model) => {
                const href = `/crud/${model}`;
                const isActive = pathname.startsWith(href);
                return (
                  <Link
                    key={model}
                    href={href}
                    className={cn(
                      "flex items-center gap-2 rounded px-2.5 py-1.5 text-xs font-mono transition-all",
                      isActive ? "text-primary-foreground bg-primary" : "text-muted-foreground/70 hover:text-foreground hover:bg-accent",
                    )}
                  >
                    <span className={cn("w-1 h-1 rounded-full flex-shrink-0", isActive ? "bg-primary-foreground" : "bg-border")} />
                    {model}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border/60">
        <div className="text-[10px] font-mono text-muted-foreground/35 space-y-1">
          <div className="flex items-center gap-2">
            <Layers className="w-3 h-3" />
            <span>prisma/schema.prisma</span>
          </div>
          <div className="flex items-center gap-2">
            <ListTree className="w-3 h-3" />
            <span>postgresql · dev</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
