import { PageHeader } from "@/components/ui/page-header";
import { ReportsPageClient } from "@/components/reports/reports-page-client";

export const metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <>
      <PageHeader
        title="Reports"
        description="Generate compliance summaries, findings exports, deadline reports and asset audit trails."
      />
      <div className="p-4 md:p-6">
        <ReportsPageClient />
      </div>
    </>
  );
}
