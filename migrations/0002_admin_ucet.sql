-- Výchozí účet majitele administrace (přihlašovací jméno admin268).
-- Heslo je uložené jen jako PBKDF2 otisk; změnit ho lze v administraci (Nastavení → Přihlašovací údaje).
-- Pokud účet už existuje, nic se nemění.
INSERT OR IGNORE INTO admin (id, email, pass_hash, pass_salt, iterations)
VALUES (1, 'admin268', 'lQ6_APxVjGn3NOjZOGPMKTkqYMdh7nOuwAeaQrAjL4Q', '9td6watGtFLnILwmn-bMvQ', 100000);
