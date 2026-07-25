"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, Calendar, AlertCircle } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { SeverityBadge, FindingStatusBadge } from "@/components/ui/badge";
import { StatusTransition } from "./status-transition";
import { FindingAssignment } from "./finding-assignment";
import type { Finding, OrgRole } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function FindingDetail({
  finding,
  teamMembers,
  userRole,
}: {
  finding: Finding;
  teamMembers: Array<{ id: string; full_name: string }>;
  userRole?: OrgRole | null;
}) {
  const canEdit = userRole && ["owner", "admin", "manager"].includes(userRole);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title={finding.title}
          description={finding.reference}
          action={<SeverityBadge severity={finding.severity} />}
        />
        <CardBody className="space-y-5">
          {finding.description && (
            <div>
              <h4 className="text-xs font-medium text-ink-muted mb-2">
                Description
              </h4>
              <p className="text-sm text-ink">{finding.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs font-medium text-ink-muted">Status</p>
              <p className="text-sm">
                <FindingStatusBadge status={finding.status} />
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-ink-muted">Severity</p>
              <p className="text-sm">
                <SeverityBadge severity={finding.severity} />
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-ink-muted">Discipline</p>
              <p className="text-sm text-ink">{finding.discipline_name}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-ink-muted">Identified</p>
              <p className="text-sm text-ink">{formatDate(finding.identified_at)}</p>
            </div>
          </div>

          {finding.location_note && (
            <div className="flex gap-2">
              <MapPin className="size-4 shrink-0 text-ink-muted mt-0.5" />
              <div>
                <p className="text-xs font-medium text-ink-muted">Location</p>
                <p className="text-sm text-ink">{finding.location_note}</p>
              </div>
            </div>
          )}

          {finding.asset_name && (
            <div>
              <p className="text-xs font-medium text-ink-muted mb-1">Asset</p>
              <Link
                href={`/assets/${finding.asset_id}`}
                className="text-sm text-brand hover:underline"
              >
                {finding.asset_name}
              </Link>
            </div>
          )}
        </CardBody>
      </Card>

      {canEdit && (
        <div className="grid gap-5 sm:grid-cols-2">
          <StatusTransition finding={finding} />
          <FindingAssignment finding={finding} teamMembers={teamMembers} />
        </div>
      )}
    </div>
  );
}
