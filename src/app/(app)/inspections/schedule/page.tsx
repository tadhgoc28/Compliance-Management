import { PageHeader } from "@/components/ui/page-header";
import { BulkScheduler } from "@/components/inspections/bulk-scheduler";
import { listAssets, listDisciplines, listTeamMembers } from "@/lib/data";

export const metadata = { title: "Schedule Inspections" };

export default async function SchedulePage() {
  const [assetsResult, disciplines, teamMembers] = await Promise.all([
    listAssets({ pageSize: 500 }),
    listDisciplines(),
    listTeamMembers(),
  ]);

  const surveyors = teamMembers.filter((m) =>
    ["surveyor", "manager", "admin"].includes(m.full_name ?? ""),
  );

  return (
    <>
      <PageHeader
        title="Schedule inspections"
        description="Bulk schedule inspections across multiple assets and assign to team members."
      />

      <div className="p-4 md:p-6">
        <BulkScheduler
          assets={assetsResult.rows}
          disciplines={disciplines}
          surveyors={surveyors.length > 0 ? surveyors : teamMembers}
        />
      </div>
    </>
  );
}
