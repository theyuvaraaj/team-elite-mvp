// Run once while the Docker image builds. Compiling a resume makes Tectonic
// download the TeX packages the template needs, so they ship inside the image
// and the first PDF after a deploy does not wait on (or time out during) that
// download. Uses the real renderer, so it cannot drift from the template.
import { renderResumeLatexPdf } from "../src/modules/resumes/latex.js";

const sample = [
  "Sample Candidate",
  "sample@example.com | +1 555 0100 | Austin, TX | linkedin.com/in/sample",
  "Senior Engineer",
  "## Summary",
  "Engineer with **bold** text & special characters: 100% of $5, C#, a_b.",
  "## Skills",
  "- **Platform**: Kubernetes, Terraform",
  "## Professional Experience",
  "**Acme** | Senior Engineer | Jan 2021 - Present",
  "- Cut latency 45% for 40000 users.",
  "## Education",
  "BS Computer Science, 2018",
].join("\n");

const pdf = await renderResumeLatexPdf(sample);
console.log(`Tectonic cache warmed (${pdf.length} byte PDF)`);
