"""
Safe ZIP extraction for the Project Security Analyzer.

Threats explicitly mitigated here:
- Path traversal / "zip slip" (entries like "../../etc/passwd")
- Absolute-path entries
- Symlink entries that could point outside the extraction root
- Archive/decompression bombs (too many files, or too much uncompressed data)

The extracted contents are only ever read for static analysis; nothing is
executed and no uploaded file is ever passed to a shell.
"""
import os
import zipfile
from dataclasses import dataclass

from app.core.config import settings


class UnsafeArchiveError(Exception):
    pass


@dataclass
class ExtractionResult:
    extract_dir: str
    file_count: int
    skipped_count: int


def _is_within_directory(directory: str, target: str) -> bool:
    abs_directory = os.path.abspath(directory)
    abs_target = os.path.abspath(target)
    return os.path.commonpath([abs_directory]) == os.path.commonpath([abs_directory, abs_target])


def safe_extract(zip_path: str, extract_dir: str) -> ExtractionResult:
    os.makedirs(extract_dir, exist_ok=True)

    file_count = 0
    skipped_count = 0
    total_uncompressed = 0

    try:
        with zipfile.ZipFile(zip_path, "r") as archive:
            infolist = archive.infolist()

            if len(infolist) > settings.MAX_FILES_PER_ARCHIVE:
                raise UnsafeArchiveError(
                    f"Archive contains {len(infolist)} entries, exceeding the safety limit of "
                    f"{settings.MAX_FILES_PER_ARCHIVE}. Refusing to extract (possible archive bomb)."
                )

            for member in infolist:
                total_uncompressed += member.file_size
                if total_uncompressed > settings.MAX_UNCOMPRESSED_ARCHIVE_BYTES:
                    raise UnsafeArchiveError(
                        "Archive's uncompressed size exceeds the safety limit. Refusing to extract "
                        "(possible archive/zip bomb)."
                    )

            for member in infolist:
                member_name = member.filename

                # Reject absolute paths and drive letters outright.
                if member_name.startswith("/") or member_name.startswith("\\") or ":" in member_name:
                    skipped_count += 1
                    continue

                target_path = os.path.join(extract_dir, member_name)

                # Reject anything that would land outside extract_dir (zip slip).
                if not _is_within_directory(extract_dir, target_path):
                    skipped_count += 1
                    continue

                # Skip symlinks - zipfile does not dereference them safely and
                # they could point outside the sandboxed extraction directory.
                mode = member.external_attr >> 16
                is_symlink = bool(mode) and (mode & 0o170000) == 0o120000
                if is_symlink:
                    skipped_count += 1
                    continue

                if member_name.endswith("/"):
                    os.makedirs(target_path, exist_ok=True)
                    continue

                os.makedirs(os.path.dirname(target_path), exist_ok=True)
                with archive.open(member) as source, open(target_path, "wb") as dest:
                    dest.write(source.read())
                file_count += 1

    except zipfile.BadZipFile as exc:
        raise UnsafeArchiveError(f"The archive is corrupted or not a valid ZIP file: {exc}") from exc

    return ExtractionResult(extract_dir=extract_dir, file_count=file_count, skipped_count=skipped_count)
