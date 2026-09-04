"""
Lightweight, heuristic dependency-manifest analysis.

This intentionally does NOT call out to any live vulnerability database (no
network access is available/appropriate during a scan of untrusted uploads).
It flags manifest-level red flags that are useful in a student/demo context
and are safe to compute purely from the manifest text.
"""
import json
import os
import re

from app.scanners.static_analyzer import Finding

_GIT_DEP_PATTERN = re.compile(r"(git\+|github\.com)", re.IGNORECASE)
_WILDCARD_VERSION_PATTERN = re.compile(r'"\s*:\s*"\*"')


def analyze_dependencies(root_dir: str) -> list[Finding]:
    findings: list[Finding] = []
    findings.extend(_analyze_package_json(root_dir))
    findings.extend(_analyze_requirements_txt(root_dir))
    return findings


def _analyze_package_json(root_dir: str) -> list[Finding]:
    findings: list[Finding] = []
    for current_dir, dirnames, filenames in os.walk(root_dir):
        dirnames[:] = [d for d in dirnames if d not in {"node_modules", ".git"}]
        if "package.json" not in filenames:
            continue
        full_path = os.path.join(current_dir, "package.json")
        rel_path = os.path.relpath(full_path, root_dir)
        try:
            with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                raw = f.read()
                data = json.loads(raw)
        except (OSError, json.JSONDecodeError):
            continue

        scripts = data.get("scripts", {})
        for script_name in ("preinstall", "postinstall", "install"):
            if script_name in scripts:
                findings.append(
                    Finding(
                        file_path=rel_path,
                        finding_type="Automatic install script in package.json",
                        severity="medium",
                        description=(
                            f"package.json defines a '{script_name}' script that runs automatically when "
                            "dependencies are installed."
                        ),
                        evidence_snippet=str(scripts[script_name])[:200],
                        recommendation="Review this script carefully before running 'npm install' on this project.",
                    )
                )

        deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
        for name, version in deps.items():
            if isinstance(version, str) and _GIT_DEP_PATTERN.search(version):
                findings.append(
                    Finding(
                        file_path=rel_path,
                        finding_type="Dependency sourced from a raw Git URL",
                        severity="low",
                        description=f"Dependency '{name}' is installed directly from a Git URL rather than a registry.",
                        evidence_snippet=f'"{name}": "{version}"',
                        recommendation="Prefer versioned registry packages; pin Git dependencies to a specific commit hash.",
                    )
                )
            if version == "*":
                findings.append(
                    Finding(
                        file_path=rel_path,
                        finding_type="Unpinned dependency version",
                        severity="low",
                        description=f"Dependency '{name}' allows any version ('*'), which can pull in unreviewed updates.",
                        evidence_snippet=f'"{name}": "*"',
                        recommendation="Pin dependencies to a specific or minimum safe version range.",
                    )
                )
    return findings


def _analyze_requirements_txt(root_dir: str) -> list[Finding]:
    findings: list[Finding] = []
    for current_dir, dirnames, filenames in os.walk(root_dir):
        dirnames[:] = [d for d in dirnames if d not in {"venv", ".venv", ".git"}]
        if "requirements.txt" not in filenames:
            continue
        full_path = os.path.join(current_dir, "requirements.txt")
        rel_path = os.path.relpath(full_path, root_dir)
        try:
            with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                lines = f.readlines()
        except OSError:
            continue

        for line in lines:
            stripped = line.strip()
            if not stripped or stripped.startswith("#"):
                continue
            if stripped.startswith("git+") or "://" in stripped:
                findings.append(
                    Finding(
                        file_path=rel_path,
                        finding_type="Dependency sourced from a raw URL",
                        severity="low",
                        description=f"Requirement line installs directly from a URL: '{stripped}'.",
                        evidence_snippet=stripped[:200],
                        recommendation="Prefer PyPI-hosted, versioned packages over direct URL installs.",
                    )
                )
            elif "==" not in stripped and ">=" not in stripped and "<=" not in stripped:
                findings.append(
                    Finding(
                        file_path=rel_path,
                        finding_type="Unpinned Python dependency",
                        severity="low",
                        description=f"Requirement '{stripped}' does not pin a version.",
                        evidence_snippet=stripped[:200],
                        recommendation="Pin dependency versions to ensure reproducible, reviewed builds.",
                    )
                )
    return findings
