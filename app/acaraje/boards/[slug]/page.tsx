"use client";

import { useParams } from "next/navigation";
import { BoardPageContent } from "@/components/routes/boards";

export default function BoardPage() {
  const params = useParams();
  const slug = params.slug as string;
  return <BoardPageContent slug={slug} />;
}
