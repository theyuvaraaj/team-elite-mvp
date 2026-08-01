-- CreateTable
CREATE TABLE "optimized_resumes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "company_name" TEXT NOT NULL,
    "job_description" TEXT NOT NULL,
    "content_markdown" TEXT NOT NULL,
    "ats_score" INTEGER NOT NULL,
    "score_breakdown" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "optimized_resumes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "optimized_resumes_candidate_id_idx" ON "optimized_resumes"("candidate_id");

-- AddForeignKey
ALTER TABLE "optimized_resumes" ADD CONSTRAINT "optimized_resumes_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "optimized_resumes" ADD CONSTRAINT "optimized_resumes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
