import { code, imp } from "ts-poet";

const SeederContent = imp("SeederContent@@/components/routes/seeder")

export const writeSeederPage = () => code`
export default function SeederPage() {
  return <${SeederContent} />;
}
`;

export default writeSeederPage;
