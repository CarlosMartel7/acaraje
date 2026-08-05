import { redirect } from "next/navigation";
import { listPages } from "@/lib/boards-config";
import { acarajePath } from "@/lib/acaraje-routes";

export default function BoardsPage() {
  const pages = listPages();
  const defaultSlug = pages[0]?.slug ?? "overview";
  redirect(acarajePath(`/boards/${defaultSlug}`));
}
