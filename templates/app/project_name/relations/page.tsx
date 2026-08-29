import { code, imp } from "ts-poet";

const RelationsContent = imp("RelationsContent@@/components/routes/relations")

export const writeRelationsPage = () => code`
export default async function RelationsPage() {
  return <${RelationsContent} />;
}
`;

export default writeRelationsPage;
