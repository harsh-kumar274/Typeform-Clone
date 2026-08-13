"""
Slug generation service.

Uses nanoid for cryptographically random URL-safe slugs.
Slugs are used for public form URLs: /f/{slug}
"""
import nanoid


def generate_slug(length: int = 10) -> str:
    """
    Generate a URL-safe random slug.
    
    Using nanoid instead of slugified-title+hash because:
    1. Titles can change after publish — a title-based slug would go stale.
    2. nanoid is cryptographically random — no collision risk at this scale.
    3. Short enough for sharing (10 chars = ~60 bits of entropy).
    """
    # Use only URL-safe characters
    alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
    return nanoid.generate(alphabet, length)
