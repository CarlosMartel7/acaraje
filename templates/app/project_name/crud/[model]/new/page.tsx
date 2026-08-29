import { code, imp } from "ts-poet";

const CrudNewContent = imp("CrudNewContent@@/components/routes/crud/[model]/new")

export const writeCrudNewPage = () => code`
export default function NewRecordPage() {
  return <${CrudNewContent} />;
}
`.toString({ prefix: '"use client";' });

export default writeCrudNewPage;
