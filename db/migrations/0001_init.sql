-- Zero-knowledge schema: the server only ever stores ciphertext, IVs and salts.

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  kdf_salt      text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE vault_items (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  ciphertext text NOT NULL,
  iv         text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX vault_items_user_id_idx ON vault_items (user_id);

CREATE TABLE share_links (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id    uuid NOT NULL REFERENCES vault_items (id) ON DELETE CASCADE,
  ciphertext text NOT NULL,
  iv         text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);

CREATE INDEX share_links_item_id_idx ON share_links (item_id);
