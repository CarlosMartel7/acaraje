import { code, imp } from "ts-poet";

const Link = imp("Link=next/link")
const GitBranch = imp("GitBranch@lucide-react")
const Table2 = imp("Table2@lucide-react")
const Hash = imp("Hash@lucide-react")
const Layers = imp("Layers@lucide-react")
const ArrowRight = imp("ArrowRight@lucide-react")
const cn = imp("cn@@/lib/utils")
const acarajePath = imp("acarajePath@@/lib/acaraje-routes")
const Card = imp("Card@@/components/ui/card")

export const writeDashboardStatCards = () => code`
function StatCard({
  label,
  value,
  icon: Icon,
  color,
  href,
  sub,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  href?: string;
  sub?: string;
}) {
  const card = (
    <${Card}
      className={${cn}(
        "group relative p-5 backdrop-blur-sm transition-all duration-200",
        "hover:border-border hover:bg-card/80",
        href && "cursor-pointer",
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">{label}</p>
          <p className={${cn}("text-3xl font-bold font-mono", color)}>{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1 font-mono">{sub}</p>}
        </div>
        <div
          className={${cn}(
            "flex items-center justify-center w-10 h-10 rounded border opacity-70",
            color.replace("text-", "border-").replace("text-", ""),
          )}
          style={{ borderColor: "currentColor", color: "inherit" }}
        >
          <Icon className={${cn}("w-5 h-5", color)} />
        </div>
      </div>
      {href && (
        <${ArrowRight} className="absolute bottom-4 right-4 w-4 h-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-all group-hover:translate-x-1 duration-200" />
      )}
    </${Card}>
  );

  if (href) return <${Link} href={href}>{card}</${Link}>;
  return card;
}

export function DashboardStatCards({ stats }: { stats: Dashboard.DashboardStats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Models"
        value={stats.totalModels}
        icon={${Table2}}
        color="text-primary-foreground"
        href={\`\${${acarajePath}("/schemas")}?tab=models\`}
        sub={\`\${stats.modelsWithMap} with @map\`}
      />
      <StatCard
        label="Relations"
        value={stats.totalRelations}
        icon={${GitBranch}}
        color="text-chart-5"
        href={${acarajePath}("/relations")}
        sub={\`across all models\`}
      />
      <StatCard
        label="Fields"
        value={stats.totalFields}
        icon={${Hash}}
        color="text-chart-4"
        sub={\`avg \${(stats.totalFields / stats.totalModels).toFixed(1)} per model\`}
      />
      <StatCard
        label="Enums"
        value={stats.totalEnums}
        icon={${Layers}}
        color="text-chart-1"
        href={\`\${${acarajePath}("/schemas")}?tab=enums\`}
        sub={\`\${stats.totalIndexes} indexes\`}
      />
    </div>
  );
}
`.toString({ prefix: '"use client";' });

export default writeDashboardStatCards;
