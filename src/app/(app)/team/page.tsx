import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { PeopleTab } from "@/components/team/people-tab";
import { RequirementsTab } from "@/components/team/requirements-tab";
import {
  listCertificationTypes,
  listCertifications,
  listDisciplineRequirements,
  listDisciplines,
  listTeamMembers,
} from "@/lib/data";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  const [teamMembers, certifications, certificationTypes, disciplines, requirements] =
    await Promise.all([
      listTeamMembers(),
      listCertifications(),
      listCertificationTypes(),
      listDisciplines(),
      listDisciplineRequirements(),
    ]);

  return (
    <>
      <PageHeader
        title="Team"
        description="Who's trained for what -- checked automatically at every QR check-in."
      />
      <div className="p-4 md:p-6">
        <Card>
          <CardBody>
            <Tabs
              items={[
                {
                  id: "people",
                  label: "People",
                  count: teamMembers.length,
                  content: (
                    <PeopleTab
                      teamMembers={teamMembers}
                      certifications={certifications}
                      certificationTypes={certificationTypes}
                    />
                  ),
                },
                {
                  id: "requirements",
                  label: "Requirements",
                  count: requirements.length,
                  content: (
                    <RequirementsTab
                      disciplines={disciplines}
                      certificationTypes={certificationTypes}
                      requirements={requirements}
                    />
                  ),
                },
              ]}
            />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
