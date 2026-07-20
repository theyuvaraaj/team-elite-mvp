import type { Application, User } from "@prisma/client";

type ApplicationWithSubmitter = Application & {
  submittedBy?: Pick<User, "id" | "name" | "email"> | null;
};

export interface CandidateApplicationDTO {
  id: string;
  companyName: string;
  jobLink: string;
  resumeLink: string | null;
  probability: string | null;
  updates: string | null;
  appliedDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface StaffApplicationDTO extends Application {
  submittedBy?: Pick<User, "id" | "name" | "email"> | null;
}

export function toCandidateApplication(
  application: ApplicationWithSubmitter,
): CandidateApplicationDTO {
  return {
    id: application.id,
    companyName: application.companyName,
    jobLink: application.jobLink,
    resumeLink: application.resumeLink,
    probability: application.probability,
    updates: application.updates,
    appliedDate: application.appliedDate,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
  };
}

export function toStaffApplication(
  application: ApplicationWithSubmitter,
): StaffApplicationDTO {
  return application;
}
