"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  Background,
  Panel,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  MarkerType,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import { cn } from "@/lib/utils";

export interface Relation {
  from: string;
  fromField: string;
  to: string;
  type: "one-to-one" | "one-to-many" | "many-to-one" | "many-to-many";
}

const RELATION_LABELS: Record<string, string> = {
  "one-to-one": "1:1",
  "one-to-many": "1:N",
  "many-to-one": "N:1",
  "many-to-many": "N:M",
};

const NODE_WIDTH = 140;
const NODE_HEIGHT = 32;

function ModelNode({ data, selected }: { data: { label: string }; selected?: boolean }) {
  const router = useRouter();
  const handleClick = useCallback(() => {
    router.push(`/crud/${data.label}`);
  }, [router, data.label]);

  return (
    <div
      onClick={handleClick}
      className={cn(
        "flex items-center justify-center w-36 h-8 rounded-md border cursor-pointer transition-all",
        "border-border/50 bg-card/80 hover:border-primary-foreground/50 hover:bg-card",
        "text-xs font-mono font-medium text-foreground",
        selected && "ring-2 ring-primary-foreground/50 border-primary-foreground/40"
      )}
    >
      {data.label}
    </div>
  );
}

const nodeTypes = { model: ModelNode };

function getLayoutedElements(
  relations: Relation[],
  direction: "TB" | "LR" = "TB"
): { nodes: Node[]; edges: Edge[] } {
  const modelSet = new Set<string>();
  for (const r of relations) {
    modelSet.add(r.from);
    modelSet.add(r.to);
  }
  const models = Array.from(modelSet);

  const nodes: Node[] = models.map((id) => ({
    id,
    type: "model",
    data: { label: id },
    position: { x: 0, y: 0 },
  }));

  const edgeMap = new Map<string, { type: string; fromField: string }>();
  for (const r of relations) {
    const key = `${r.from}::${r.to}::${r.fromField}`;
    if (!edgeMap.has(key)) {
      edgeMap.set(key, { type: r.type, fromField: r.fromField });
    }
  }

  const edges: Edge[] = Array.from(edgeMap.entries()).map(([key, { type, fromField }]) => {
    const [source, target] = key.split("::").slice(0, 2);
    return {
      id: key,
      source: source!,
      target: target!,
      label: `${RELATION_LABELS[type]} .${fromField}`,
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed },
      labelStyle: { fontSize: 10, fontFamily: "ui-monospace" },
      labelBgStyle: { fill: "var(--card)" },
      labelBgPadding: [4, 2] as [number, number],
      labelBgBorderRadius: 4,
    };
  });

  if (nodes.length === 0) return { nodes, edges };

  const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction, ranksep: 50, nodesep: 40 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const isHorizontal = direction === "LR";
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
      sourcePosition: isHorizontal ? Position.Left : Position.Top,
      targetPosition: isHorizontal ? Position.Right : Position.Bottom,
    };
  });

  return { nodes: layoutedNodes, edges };
}

export function RelationGraph({ relations }: { relations: Relation[] }) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => getLayoutedElements(relations),
    [relations]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onLayout = useCallback(
    (direction: "TB" | "LR") => {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        relations,
        direction
      );
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    },
    [relations, setNodes, setEdges]
  );

  if (relations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 rounded-lg border border-border/50 bg-card/40 text-muted-foreground">
        <p className="text-sm">No relations to display</p>
      </div>
    );
  }

  return (
    <div className="h-[500px] rounded-lg border border-border/50 bg-card/40 overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
        className="bg-transparent"
      >
        <Background gap={16} size={1} color="var(--border)" />
        <Panel position="top-right" className="flex gap-3">
          <button
            onClick={() => onLayout("TB")}
            className="px-3 py-1.5 text-xs font-mono rounded border border-border/50 bg-card/60 hover:bg-card text-foreground transition-colors"
          >
            Vertical
          </button>
          <button
            onClick={() => onLayout("LR")}
            className="px-3 py-1.5 text-xs font-mono rounded border border-border/50 bg-card/60 hover:bg-card text-foreground transition-colors"
          >
            Horizontal
          </button>
        </Panel>
      </ReactFlow>
    </div>
  );
}
