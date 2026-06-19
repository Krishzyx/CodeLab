import axios from "axios";
import { logger } from "./logger";

// Public Judge0 CE instance — no API key required for basic usage
const JUDGE0_BASE = "https://ce.judge0.com";

export const LANGUAGE_IDS: Record<string, number> = {
  javascript: 63,
  typescript: 74,
  python: 71,
  java: 62,
  "c++": 54,
  c: 50,
  go: 60,
  rust: 73,
  ruby: 72,
  php: 68,
};

export const LANGUAGE_NAMES: Record<number, string> = Object.fromEntries(
  Object.entries(LANGUAGE_IDS).map(([k, v]) => [v, k])
);

interface Judge0Token {
  token: string;
}

interface Judge0Result {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  time: string | null;
  memory: number | null;
  status: {
    id: number;
    description: string;
  };
}

// Status ID mapping from Judge0
function mapStatus(statusId: number): string {
  switch (statusId) {
    case 3: return "accepted";
    case 4: return "wrong_answer";
    case 5: return "time_limit_exceeded";
    case 6: return "compilation_error";
    case 7:
    case 8:
    case 9:
    case 10:
    case 11:
    case 12: return "runtime_error";
    default: return "pending";
  }
}

export async function submitToJudge0(
  sourceCode: string,
  languageId: number,
  stdin: string = "",
  expectedOutput?: string
): Promise<{ status: string; output: string; stderr: string | null; runtime: number | null; memory: number | null }> {
  try {
    const tokenRes = await axios.post<Judge0Token>(
      `${JUDGE0_BASE}/submissions?base64_encoded=false&wait=false`,
      {
        source_code: sourceCode,
        language_id: languageId,
        stdin,
        expected_output: expectedOutput,
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      }
    );

    const { token } = tokenRes.data;

    // Poll for result
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      const resultRes = await axios.get<Judge0Result>(
        `${JUDGE0_BASE}/submissions/${token}?base64_encoded=false`,
        { timeout: 10000 }
      );
      const result = resultRes.data;
      if (result.status.id > 2) {
        const output = result.stdout ?? result.compile_output ?? result.message ?? "";
        const stderr = result.stderr ?? result.compile_output ?? null;
        return {
          status: mapStatus(result.status.id),
          output: output.trim(),
          stderr: stderr?.trim() ?? null,
          runtime: result.time ? Math.round(parseFloat(result.time) * 1000) : null,
          memory: result.memory,
        };
      }
    }
    return { status: "time_limit_exceeded", output: "", stderr: "Execution timed out", runtime: null, memory: null };
  } catch (err) {
    logger.error({ err }, "Judge0 submission error");
    return { status: "runtime_error", output: "", stderr: "Execution service unavailable", runtime: null, memory: null };
  }
}
