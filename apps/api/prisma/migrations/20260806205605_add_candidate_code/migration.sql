-- Short, human-memorable candidate reference used in URLs (4-5 digits).
CREATE SEQUENCE IF NOT EXISTS candidate_code_seq START WITH 1000 INCREMENT BY 1;

ALTER TABLE "candidates"
  ADD COLUMN "code" INTEGER NOT NULL DEFAULT nextval('candidate_code_seq'::regclass);

-- Keep the sequence owned by the column so it drops with the table.
ALTER SEQUENCE candidate_code_seq OWNED BY "candidates"."code";

CREATE UNIQUE INDEX "candidates_code_key" ON "candidates"("code");
