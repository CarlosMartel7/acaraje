import { code, imp } from "ts-poet";

const ArrowRight = imp("ArrowRight@lucide-react")
const Table2 = imp("Table2@lucide-react")
const cn = imp("cn@@/lib/utils")
const getRelationTypeColor = imp("getRelationTypeColor@@/lib/utils")
const Card = imp("Card@@/components/ui/card")
const RELATION_COLORS = imp("RELATION_COLORS@./relations-constants")
const RELATION_LABELS = imp("RELATION_LABELS@./relations-constants")

export const writeRelationModelCard = () => code`
type RelationModelCardProps = {
  fromModel: string;
  rels: Relations.Relation[];
  connectedModels: Set<string> | null;
  onHoverModel: (model: string | null) => void;
};

export function RelationModelCard({ fromModel, rels, connectedModels, onHoverModel }: RelationModelCardProps) {
  const dimmed = connectedModels !== null && !connectedModels.has(fromModel);

  return (
    <${Card} className={${cn}("p-[18px] pb-2 transition-opacity duration-200", dimmed ? "opacity-30" : "opacity-100")}>
      <div
        className="mb-2.5 flex items-center gap-2.5"
        onMouseEnter={() => onHoverModel(fromModel)}
        onMouseLeave={() => onHoverModel(null)}
      >
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground/90">
          <${Table2} className="h-4 w-4" />
        </span>
        <h2 className="truncate text-[15px] font-bold">{fromModel}</h2>
        <span
          className="ml-auto rounded-md bg-primary/15 px-2.5 py-1 text-[10px] font-semibold text-primary"
          title={\`\${rels.length} relation\${rels.length !== 1 ? "s" : ""}\`}
        >
          {rels.length}
        </span>
      </div>
      <ul>
        {rels.map((rel, i) => (
          <li
            key={\`\${rel.from}-\${rel.fromField}-\${rel.to}-\${i}\`}
            className="flex items-center gap-2.5 border-t border-border/80 px-3.5 py-[11px] text-[13px]"
            onMouseEnter={() => onHoverModel(rel.to)}
            onMouseLeave={() => onHoverModel(null)}
          >
            <span className="min-w-0 truncate font-mono text-muted-foreground">{rel.fromField}</span>
            <${ArrowRight} className={${cn}("h-3.5 w-3.5 flex-shrink-0", ${getRelationTypeColor}(rel.type))} aria-hidden="true" />
            <span className="min-w-0 truncate font-semibold text-foreground">{rel.to}</span>
            <span
              className={${cn}("ml-auto flex-shrink-0 rounded-md px-2 py-[3px] font-mono text-[10px]", ${RELATION_COLORS}[rel.type])}
              title={rel.type.replace(/-/g, " ")}
            >
              {${RELATION_LABELS}[rel.type]}
            </span>
          </li>
        ))}
      </ul>
    </${Card}>
  );
}
`.toString({ prefix: '"use client";' });

export default writeRelationModelCard;
