-- A small value encrypted with the master-passphrase key. It lets the client tell a wrong
-- passphrase from a right one even when the vault is empty. It reveals nothing about the key.

ALTER TABLE users ADD COLUMN key_check_ciphertext text NOT NULL;

ALTER TABLE users ADD COLUMN key_check_iv text NOT NULL;
