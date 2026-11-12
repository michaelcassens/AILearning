"""Field-level encryption for everything stored in the database.

* Values are encrypted with Fernet (AES-128-CBC + HMAC-SHA256, authenticated).
  ``MultiFernet`` lets you add a new key in front and keep old keys around to
  decrypt existing rows until they are rotated (see ``flask rotate-keys``).
* Because encrypted values are randomized, they cannot be searched. For the
  few fields we must look up (username, email, role name) we also store a
  "blind index": a keyed HMAC of the normalized value, using a separate key.
"""
import base64
import hashlib
import hmac

from cryptography.fernet import Fernet, MultiFernet


def _as_bytes(value):
    return value.encode() if isinstance(value, str) else value


class FieldCrypto:
    def __init__(self, encryption_keys, index_key):
        if not encryption_keys:
            raise ValueError("At least one encryption key is required.")
        self._fernet = MultiFernet([Fernet(_as_bytes(k)) for k in encryption_keys])
        self._index_key = base64.urlsafe_b64decode(_as_bytes(index_key))
        if len(self._index_key) < 32:
            raise ValueError("The index key must be at least 32 bytes.")

    def encrypt_bytes(self, data):
        return None if data is None else self._fernet.encrypt(data)

    def decrypt_bytes(self, token):
        return None if token is None else self._fernet.decrypt(token)

    def encrypt(self, text):
        return None if text is None else self.encrypt_bytes(text.encode("utf-8"))

    def decrypt(self, token):
        data = self.decrypt_bytes(token)
        return None if data is None else data.decode("utf-8")

    def rotate(self, token):
        """Re-encrypt a token with the primary (first) key."""
        return None if token is None else self._fernet.rotate(token)

    def blind_index(self, value):
        normalized = value.strip().casefold().encode("utf-8")
        return hmac.new(self._index_key, normalized, hashlib.sha256).hexdigest()

    def fingerprint(self, value):
        """Short keyed digest used to bind a session to a password hash."""
        return hmac.new(self._index_key, _as_bytes(value), hashlib.sha256).hexdigest()[:32]
