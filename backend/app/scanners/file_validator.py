"""
Upload validation for the Project Security Analyzer.

The uploaded file is ALWAYS treated as untrusted input:
- extension + magic-byte checks (not just trusting the client-supplied name)
- enforced maximum size
- stored on disk under a randomized filename (never the client-supplied name)
- never executed
"""
import os
import uuid
import zipfile
from dataclasses import dataclass

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings

_ZIP_MAGIC_BYTES = (b"PK\x03\x04", b"PK\x05\x06", b"PK\x07\x08")


@dataclass
class ValidatedUpload:
    stored_path: str
    stored_filename: str
    original_filename: str
    size_bytes: int


def _ensure_upload_dir() -> str:
    os.makedirs(settings.UPLOAD_TMP_DIR, exist_ok=True)
    return settings.UPLOAD_TMP_DIR


def validate_and_store_upload(file: UploadFile) -> ValidatedUpload:
    original_name = file.filename or "upload"
    ext = os.path.splitext(original_name)[1].lower()

    if ext not in settings.allowed_extensions_list:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(settings.allowed_extensions_list)}",
        )

    upload_dir = _ensure_upload_dir()
    stored_filename = f"{uuid.uuid4().hex}{ext}"
    stored_path = os.path.join(upload_dir, stored_filename)

    size = 0
    max_size = settings.UPLOAD_MAX_SIZE_BYTES
    try:
        with open(stored_path, "wb") as out_file:
            while chunk := file.file.read(1024 * 1024):
                size += len(chunk)
                if size > max_size:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"File exceeds the maximum allowed size of {max_size // (1024 * 1024)} MB.",
                    )
                out_file.write(chunk)
    except HTTPException:
        if os.path.exists(stored_path):
            os.remove(stored_path)
        raise
    finally:
        file.file.close()

    # Verify actual file content (magic bytes), not just the extension, to
    # reduce the chance of a renamed/disguised file being processed.
    if ext == ".zip":
        with open(stored_path, "rb") as f:
            header = f.read(4)
        if header not in _ZIP_MAGIC_BYTES and not zipfile.is_zipfile(stored_path):
            os.remove(stored_path)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The uploaded file is not a valid ZIP archive.",
            )

    return ValidatedUpload(
        stored_path=stored_path,
        stored_filename=stored_filename,
        original_filename=original_name,
        size_bytes=size,
    )


def cleanup_file(path: str) -> None:
    try:
        if path and os.path.exists(path):
            os.remove(path)
    except OSError:
        pass
