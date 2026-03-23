import type { GitHubConnectorConfig } from "./connector.js";
import { adrIssueTemplateYaml } from "./templates/adr-issue-template.js";
import { blockIssueTemplateYaml } from "./templates/block-issue-template.js";
import { chainCharterMarkdown } from "./templates/chain-charter.js";
import { contributingMarkdown } from "./templates/contributing.js";
import { prTemplateMarkdown } from "./templates/pr-template.js";
import { verifyWorkflowYaml } from "./templates/verify-workflow.js";

export interface ScaffoldOptions {
  branch?: string;
  dir?: string;
}

export interface ScaffoldResult {
  action: "created" | "skipped" | "error";
  path: string;
  error?: string;
}

const GITKEEP_CONTENT = "Cg=="; // base64 of "\n"

function scaffoldHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function apiBase(owner: string, repo: string): string {
  return `https://api.github.com/repos/${owner}/${repo}/contents`;
}

async function writeFile(
  owner: string,
  repo: string,
  token: string,
  path: string,
  content: string,
  branch: string,
): Promise<ScaffoldResult> {
  const base = apiBase(owner, repo);
  const url = `${base}/${path}?ref=${branch}`;
  const headers = scaffoldHeaders(token);

  // Check if file already exists
  const existing = await fetch(url, { headers });
  if (existing.ok) {
    return { action: "skipped", path };
  }

  const body = {
    message: `glorychain: scaffold ${path}`,
    content,
    branch,
  };

  const res = await fetch(`${base}/${path}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return {
      action: "error",
      path,
      error: `HTTP ${res.status} ${res.statusText}`,
    };
  }

  return { action: "created", path };
}

function toBase64(text: string): string {
  return Buffer.from(text, "utf8").toString("base64");
}

export async function scaffoldRepo(
  config: GitHubConnectorConfig,
  options: ScaffoldOptions = {},
): Promise<ScaffoldResult[]> {
  const branch = options.branch ?? config.branch ?? "main";
  const dir = options.dir ?? config.dir ?? "chains";
  const { owner, repo, token } = config;

  const files: Array<{ path: string; content: string }> = [
    { path: `${dir}/.gitkeep`, content: GITKEEP_CONTENT },
    { path: "adr/.gitkeep", content: GITKEEP_CONTENT },
    {
      path: ".github/CODEOWNERS",
      content: toBase64("# Add code owners here\n# * @your-username\n"),
    },
    {
      path: "README.md",
      content: toBase64(
        `# ${repo}\n\nThis repository is managed with [glorychain](https://github.com/glorychain/glorychain).\n\nSee [CONTRIBUTING.md](./CONTRIBUTING.md) and [CHAIN_CHARTER.md](./CHAIN_CHARTER.md) to get started.\n`,
      ),
    },
    {
      path: ".github/workflows/glorychain-verify.yml",
      content: toBase64(verifyWorkflowYaml({ dir, branch })),
    },
    {
      path: ".github/pull_request_template.md",
      content: toBase64(prTemplateMarkdown()),
    },
    {
      path: ".github/ISSUE_TEMPLATE/block-submission.yml",
      content: toBase64(blockIssueTemplateYaml()),
    },
    {
      path: ".github/ISSUE_TEMPLATE/adr-submission.yml",
      content: toBase64(adrIssueTemplateYaml()),
    },
    {
      path: "CHAIN_CHARTER.md",
      content: toBase64(chainCharterMarkdown({ dir })),
    },
    {
      path: "CONTRIBUTING.md",
      content: toBase64(contributingMarkdown({ dir, branch })),
    },
  ];

  const results: ScaffoldResult[] = [];

  for (const file of files) {
    try {
      const result = await writeFile(owner, repo, token, file.path, file.content, branch);
      results.push(result);
    } catch (err) {
      results.push({ action: "error", path: file.path, error: String(err) });
    }
  }

  return results;
}
