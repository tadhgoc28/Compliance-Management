import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { FindingDetail } from "@/components/findings/finding-detail";
import { AuditHistory } from "@/components/findings/audit-history";
import { getFinding, listTeamMembers } from "@/lib/data";
import { getEntityAuditTrail } from "@/lib/data/audit";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata = { title: "Finding" };

export default async function FindingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [finding, teamMembers, history] = await Promise.all([
    getFinding(id),
    listTeamMembers(),
    getEntityAuditTrail("finding", id),
  ]);

  if (!finding) {
    notFound();
  }

  let userRole: string | null = null;
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase
        .from("memberships")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      userRole = data?.role ?? null;
    }
  }

  return (
    <>
      <PageHeader
        title="Finding detail"
        action={
          <Link
            href="/findings"
            className="flex items-center gap-1.5 text-sm text-brand hover:underline"
          >
            <ChevronLeft className="size-4" />
            Back to findings
          </Link>
        }
      />

      <div className="space-y-5 p-4 md:p-6">
        <FindingDetail
          finding={finding}
          teamMembers={teamMembers}
          userRole={userRole as any}
        />
        <AuditHistory logs={history} />
      </div>
    </>
  );
}
