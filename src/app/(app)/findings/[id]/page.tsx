import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { FindingDetail } from "@/components/findings/finding-detail";
import { getFinding, listTeamMembers } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata = { title: "Finding" };

export default async function FindingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [finding, teamMembers] = await Promise.all([
    getFinding(id),
    listTeamMembers(),
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

      <div className="p-4 md:p-6">
        <FindingDetail
          finding={finding}
          teamMembers={teamMembers}
          userRole={userRole as any}
        />
      </div>
    </>
  );
}
