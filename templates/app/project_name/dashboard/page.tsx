import { code, imp } from "ts-poet";

const DashboardContent = imp("DashboardContent@@/components/routes/dashboard")

export const writeDashboardPage = () => code`
export default async function DashboardPage() {
  return <${DashboardContent} />;
}
`;

export default writeDashboardPage;
