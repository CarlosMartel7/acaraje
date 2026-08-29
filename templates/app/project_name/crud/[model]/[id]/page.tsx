import { code, imp } from "ts-poet";

const CrudEditContent = imp("CrudEditContent@@/components/routes/crud/[model]/edit")

export const writeCrudEditPage = () => code`
export default function EditRecordPage() {
  return <${CrudEditContent} />;
}
`.toString({ prefix: '"use client";' });

export default writeCrudEditPage;
