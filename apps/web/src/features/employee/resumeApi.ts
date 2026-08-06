import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

export interface ResumeScoreComponent { earned: number; possible: number }
export interface ResumeScoreBreakdown {
  keywords: ResumeScoreComponent & { missing: string[] };
  jobTitle: ResumeScoreComponent & { expected: string | null };
  contact: ResumeScoreComponent & { missing: string[] };
  measurable: ResumeScoreComponent;
  structure: ResumeScoreComponent & { missing: string[] };
  dates: ResumeScoreComponent;
  length: ResumeScoreComponent & { words: number };
  parseability: ResumeScoreComponent & { issues: string[] };
}
export interface OptimizedResumeSummary {
  id: string; companyName: string; atsScore: number; createdAt: string;
  createdBy: { id: string; name: string };
}
export interface OptimizeResult { id: string; atsScore: number; scoreBreakdown: ResumeScoreBreakdown }

export function useCandidateResumes(candidateId?: string) {
  return useQuery({
    queryKey: ["candidate", candidateId, "resumes"],
    queryFn: () => api<{ resumes: OptimizedResumeSummary[] }>(`/api/candidates/${candidateId}/resumes`),
    enabled: Boolean(candidateId),
  });
}

export function useOptimizeResume(candidateId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      file: File;
      jobDescription: string;
      companyName: string;
      mode: "rewrite" | "content";
      alignJobTitles: boolean;
      addCertifications: boolean;
      addLocation: boolean;
      location: string;
    }) => {
      const form = new FormData();
      // Text fields MUST be appended before the file: the API reads them from
      // `request.file().fields`, which only sees parts that precede the file
      // in the multipart stream.
      form.append("jobDescription", input.jobDescription);
      form.append("companyName", input.companyName);
      form.append("mode", input.mode);
      form.append("alignJobTitles", String(input.alignJobTitles));
      form.append("addCertifications", String(input.addCertifications));
      form.append("addLocation", String(input.addLocation));
      if (input.location.trim()) form.append("location", input.location.trim());
      form.append("file", input.file);
      return api<OptimizeResult>(`/api/candidates/${candidateId}/resumes/optimize`, {
        method: "POST",
        body: form,
        // Backstop so the UI never spins forever; the server bounds each
        // optimize with its own per-call timeout well under this.
        signal: AbortSignal.timeout(160_000),
      });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["candidate", candidateId, "resumes"] }),
  });
}

export async function downloadResume(candidateId: string, resumeId: string, format: "pdf" | "docx") {
  const res = await fetch(`/api/candidates/${candidateId}/resumes/${resumeId}/download?format=${format}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Download failed");
  const disposition = res.headers.get("content-disposition") ?? "";
  const named = /filename="?([^";]+)"?/i.exec(disposition)?.[1];
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = named ? decodeURIComponent(named) : `resume.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
