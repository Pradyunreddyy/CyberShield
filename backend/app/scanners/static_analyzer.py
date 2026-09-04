"""
Static analysis for the Project Security Analyzer.

This module NEVER executes, imports, or evaluates any uploaded file. It only
opens files as plain text and matches known-risky patterns with regular
expressions - the same category of technique used by open-source SAST tools
such as Bandit or Semgrep. Findings are heuristic and are always presented as
"potentially suspicious", never as a definitive verdict.
"""
import os
import re
from dataclasses import dataclass, field

# Extensions we will read as text for pattern scanning. Everything else is
# counted as "skipped" rather than opened, and binaries are never executed.
_SCANNABLE_EXTENSIONS = {
    ".py", ".js", ".jsx", ".ts", ".tsx", ".php", ".rb", ".go", ".java",
    ".c", ".cpp", ".cs", ".sh", ".bash", ".ps1", ".yml", ".yaml", ".json",
    ".env", ".txt", ".md", ".html",
}

# Directories that are safe to ignore (dependency caches, VCS metadata, etc.)
_IGNORED_DIR_NAMES = {".git", "node_modules", "__pycache__", ".venv", "venv", "dist", "build"}

_MAX_FILE_READ_BYTES = 512 * 1024  # cap per-file reads to keep the scan fast/bounded
_MAX_SNIPPET_LEN = 220


@dataclass
class Finding:
    file_path: str
    finding_type: str
    severity: str  # info | low | medium | high | critical
    description: str
    evidence_snippet: str | None
    recommendation: str


@dataclass
class StaticScanResult:
    files_scanned: int = 0
    files_skipped: int = 0
    findings: list[Finding] = field(default_factory=list)


# Each rule: (compiled regex, finding_type, severity, description, recommendation)
_RULES: list[tuple[re.Pattern, str, str, str, str]] = [
    (
        re.compile(r"\beval\s*\("),
        "Dynamic code execution (eval)",
        "high",
        "The code calls eval() on a value, which can execute arbitrary code if the input is attacker-influenced.",
        "Avoid eval(); use safe parsing (e.g. json.loads) or an explicit allow-list of operations instead.",
    ),
    (
        re.compile(r"\bexec\s*\("),
        "Dynamic code execution (exec)",
        "high",
        "The code calls exec(), which can run arbitrary code if the executed string is not fully trusted.",
        "Avoid exec(); refactor to explicit, non-dynamic logic.",
    ),
    (
        re.compile(r"os\.system\s*\("),
        "OS command execution",
        "high",
        "The code shells out via os.system(), which is risky if any part of the command includes external input.",
        "Use subprocess with a list of arguments and shell=False, and validate/sanitize any external input.",
    ),
    (
        re.compile(r"subprocess\.(Popen|call|run)\([^)]*shell\s*=\s*True"),
        "Shell command execution (shell=True)",
        "high",
        "subprocess is invoked with shell=True, which can enable command injection if inputs are not sanitized.",
        "Use shell=False with an argument list, and validate/escape any user-controlled input.",
    ),
    (
        re.compile(r"child_process\.(exec|execSync)\s*\("),
        "OS command execution (Node.js)",
        "high",
        "Node's child_process.exec runs a string through a shell, which is risky with untrusted input.",
        "Prefer execFile/spawn with an argument array instead of a shell string.",
    ),
    (
        re.compile(r"pickle\.loads?\s*\("),
        "Unsafe deserialization (pickle)",
        "high",
        "pickle can execute arbitrary code during deserialization of untrusted data.",
        "Avoid unpickling untrusted data; use a safe format such as JSON instead.",
    ),
    (
        re.compile(r"yaml\.load\s*\((?!.*Loader\s*=\s*yaml\.SafeLoader)"),
        "Unsafe deserialization (yaml.load)",
        "medium",
        "yaml.load without SafeLoader can instantiate arbitrary Python objects from untrusted YAML.",
        "Use yaml.safe_load() or pass Loader=yaml.SafeLoader explicitly.",
    ),
    (
        re.compile(r"(?i)(api[_-]?key|secret[_-]?key|access[_-]?token|password)\s*[:=]\s*['\"][A-Za-z0-9/_\-+=]{8,}['\"]"),
        "Hardcoded credential/secret",
        "critical",
        "A string resembling a hardcoded API key, password, or secret token was found in source code.",
        "Remove the hardcoded secret, rotate it immediately, and load credentials from environment variables instead.",
    ),
    (
        re.compile(r"AKIA[0-9A-Z]{16}"),
        "Hardcoded AWS access key",
        "critical",
        "A string matching the AWS access key ID format was found in source code.",
        "Rotate this AWS key immediately and load credentials via environment variables or a secrets manager.",
    ),
    (
        re.compile(r"-----BEGIN (RSA|EC|OPENSSH|DSA) PRIVATE KEY-----"),
        "Embedded private key",
        "critical",
        "A private key appears to be committed directly inside the project.",
        "Remove the private key from source control, rotate it, and load keys from a secure secret store.",
    ),
    (
        re.compile(r"(?i)\bcurl\b.*\|\s*(sh|bash)"),
        "Remote script piped into a shell",
        "high",
        "The code downloads a remote script and pipes it directly into a shell interpreter.",
        "Avoid piping remote content into a shell; download, review, and verify a script's checksum before running it.",
    ),
    (
        re.compile(r"(?i)base64\.b64decode\([^)]*\)\s*\)?\s*;?\s*(exec|eval)\s*\("),
        "Obfuscated payload execution",
        "critical",
        "Base64-decoded content is passed directly into exec/eval, a pattern commonly used to hide malicious payloads.",
        "Do not execute decoded/obfuscated content; inspect the decoded payload manually before deciding how to proceed.",
    ),
    (
        re.compile(r"(?i)DROP\s+TABLE|;\s*--\s|UNION\s+SELECT"),
        "Possible SQL injection pattern",
        "medium",
        "A string pattern commonly associated with SQL injection payloads was found.",
        "Use parameterized queries / an ORM instead of building SQL via string concatenation.",
    ),
    (
        re.compile(r"f?[\"']SELECT .* FROM .*\{.*\}.*[\"']|\.format\(.*\)\s*\)?\s*#?\s*SQL"),
        "SQL built via string interpolation",
        "medium",
        "A SQL query appears to be constructed using string interpolation/concatenation of variable data.",
        "Use parameterized queries (e.g. cursor.execute(query, params)) instead of interpolating values into SQL text.",
    ),
    (
        re.compile(r"debug\s*=\s*True", re.IGNORECASE),
        "Debug mode enabled",
        "low",
        "Debug mode appears to be enabled, which can leak stack traces and internals in production.",
        "Ensure debug mode is disabled in production configurations.",
    ),
    (
        re.compile(r"Access-Control-Allow-Origin['\"]?\s*[:=]\s*['\"]\*['\"]"),
        "Permissive CORS configuration",
        "medium",
        "CORS appears to be configured to allow any origin ('*'), which can be unsafe for authenticated APIs.",
        "Restrict CORS to a specific, trusted list of origins, especially for endpoints requiring authentication.",
    ),
]


def _iter_scannable_files(root_dir: str):
    for current_dir, dirnames, filenames in os.walk(root_dir):
        dirnames[:] = [d for d in dirnames if d not in _IGNORED_DIR_NAMES and not d.startswith(".")]
        for filename in filenames:
            yield os.path.join(current_dir, filename)


def run_static_analysis(root_dir: str) -> StaticScanResult:
    result = StaticScanResult()

    for full_path in _iter_scannable_files(root_dir):
        rel_path = os.path.relpath(full_path, root_dir)
        ext = os.path.splitext(full_path)[1].lower()

        if ext not in _SCANNABLE_EXTENSIONS:
            result.files_skipped += 1
            continue

        try:
            if os.path.getsize(full_path) > 5 * 1024 * 1024:  # skip very large files
                result.files_skipped += 1
                continue
            with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read(_MAX_FILE_READ_BYTES)
        except OSError:
            result.files_skipped += 1
            continue

        result.files_scanned += 1

        for pattern, finding_type, severity, description, recommendation in _RULES:
            match = pattern.search(content)
            if match:
                start = max(0, match.start() - 40)
                end = min(len(content), match.end() + 40)
                snippet = content[start:end].replace("\n", " ").strip()[:_MAX_SNIPPET_LEN]
                result.findings.append(
                    Finding(
                        file_path=rel_path,
                        finding_type=finding_type,
                        severity=severity,
                        description=description,
                        evidence_snippet=snippet,
                        recommendation=recommendation,
                    )
                )

    return result
