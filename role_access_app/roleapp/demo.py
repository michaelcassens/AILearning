"""Example data for trying the app. Never run this against a real database."""
import secrets
import struct
import zlib

from . import models


def _square_png(size=64, rgba=(0x70, 0x1C, 0x30, 0xFF)):
    """A small solid-colour PNG so there's a media item to look at."""

    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))

    row = b"\x00" + bytes(rgba) * size
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(row * size))
        + chunk(b"IEND", b"")
    )


def seed():
    public = models.public_role_id()
    staff = models.create_role("Staff", "University staff")
    faculty = models.create_role("Faculty", "Teaching and research faculty")

    models.create_content("Campus news", "Welcome! Everyone who signs in can read this.", [public])
    models.create_content("Staff handbook", "Internal procedures for staff.", [staff])
    models.create_content("Grading guidelines", "Only faculty can read this.", [faculty])
    models.create_content(
        "Department meeting notes", "Shared with staff and faculty.", [staff, faculty]
    )
    models.create_content(
        "Logo (image)", "", [staff], media=(_square_png(), "logo.png", "image/png")
    )
    models.create_content("Draft (no roles)", "Only superusers see untagged items.", [])

    lines = ["Created roles Staff and Faculty, and six content items.", "Demo users:"]
    for username, role_ids in [
        ("public_user", []),
        ("staff_user", [staff]),
        ("faculty_user", [faculty]),
    ]:
        password = secrets.token_urlsafe(12)
        models.create_user(username, password, role_ids=role_ids)
        lines.append(f"  {username:<14} password: {password}")
    return lines
