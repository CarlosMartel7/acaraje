import { code, imp } from "ts-poet";

const DashboardStatCards = imp("DashboardStatCards@./stat-cards")
const DashboardModelsSection = imp("DashboardModelsSection@./models")
const DashboardHeader = imp("DashboardHeader@@/components/routes/skeletons")
const DashboardBodySkeleton = imp("DashboardBodySkeleton@@/components/routes/skeletons")
const AcarajeCalls_dashboard = imp("AcarajeCalls_dashboard=./[[api-calls]]")

export const writeDashboardContent = () => code`
export function DashboardContent() {
  const { stats } = ${AcarajeCalls_dashboard}();

  return (
    <div className="p-8 space-y-8 animate-in">
      <${DashboardHeader} />

      {!stats ? (
        <${DashboardBodySkeleton} />
      ) : (
        <>
          <${DashboardStatCards} stats={stats} />
          <${DashboardModelsSection} stats={stats} />
        </>
      )}
    </div>
  );
}
`.toString({ prefix: '"use client";' });

export default writeDashboardContent;
