import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

export interface ResumeScoreComponent { earned: number; possible: number }
export interface ResumeScoreBreakdown {
  keywords: ResumeScoreComponent & { missing: string[] };
  structure: ResumeScoreComponent;
  parseability: ResumeScoreComponent;
  contact: ResumeScoreComponent;
  length: ResumeScoreComponent;
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
    mutationFn: (input: { file: File; jobDescription: string; companyName: string }) => {
      const form = new FormData();
      // Text fields MUST be appended before the file: the API reads them from
      // `request.file().fields`, which only sees parts that precede the file
      // in the multipart stream.
      form.append("jobDescription", input.jobDescription);
      form.append("companyName", input.companyName);
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
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `resume.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
