-- Version 1: UTC timestamps use ISO-8601 text; weights use integer milligrams.
CREATE TABLE product_groups (
  id TEXT PRIMARY KEY, name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  sort_order INTEGER NOT NULL DEFAULT 0, is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')), deleted_at TEXT
);
CREATE TABLE main_categories (
  id TEXT PRIMARY KEY, product_group_id TEXT NOT NULL REFERENCES product_groups(id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0), sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')), deleted_at TEXT
);
CREATE TABLE workshops (
  id TEXT PRIMARY KEY, name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')), deleted_at TEXT
);
CREATE TABLE label_templates (
  id TEXT PRIMARY KEY, name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  template_kind TEXT NOT NULL CHECK (length(trim(template_kind)) > 0),
  width_mm INTEGER NOT NULL CHECK (width_mm > 0), height_mm INTEGER NOT NULL CHECK (height_mm > 0),
  layout_json TEXT NOT NULL CHECK (json_valid(layout_json)), is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE TABLE users (
  id TEXT PRIMARY KEY, display_name TEXT NOT NULL CHECK (length(trim(display_name)) > 0),
  username TEXT NOT NULL CHECK (length(trim(username)) > 0), role TEXT NOT NULL CHECK (role IN ('admin', 'operator')),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  password_hash TEXT, password_algorithm TEXT, password_version INTEGER,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')), deleted_at TEXT,
  CHECK ((password_hash IS NULL AND password_algorithm IS NULL AND password_version IS NULL)
      OR (password_hash IS NOT NULL AND password_algorithm IS NOT NULL AND password_version IS NOT NULL))
);
CREATE TABLE products (
  id TEXT PRIMARY KEY, product_code TEXT NOT NULL CHECK (length(trim(product_code)) > 0),
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  product_group_id TEXT REFERENCES product_groups(id) ON DELETE RESTRICT,
  main_category_id TEXT REFERENCES main_categories(id) ON DELETE RESTRICT,
  workshop_id TEXT REFERENCES workshops(id) ON DELETE RESTRICT,
  label_template_id TEXT REFERENCES label_templates(id) ON DELETE RESTRICT,
  purity_per_mille INTEGER NOT NULL CHECK (purity_per_mille BETWEEN 0 AND 1000),
  weight_mg INTEGER NOT NULL CHECK (weight_mg >= 0),
  stone_weight_mg INTEGER NOT NULL DEFAULT 0 CHECK (stone_weight_mg >= 0 AND stone_weight_mg <= weight_mg),
  size TEXT, quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0), image_path TEXT, note TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'pending_print', 'inactive', 'packaged', 'returned')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')), deleted_at TEXT
);
CREATE TABLE packages (
  id TEXT PRIMARY KEY, package_code TEXT NOT NULL UNIQUE CHECK (length(trim(package_code)) > 0),
  status TEXT NOT NULL CHECK (status IN ('open', 'closed', 'cancelled')),
  operator_user_id TEXT REFERENCES users(id) ON DELETE RESTRICT,
  item_count INTEGER NOT NULL DEFAULT 0 CHECK (item_count >= 0),
  total_weight_mg INTEGER NOT NULL DEFAULT 0 CHECK (total_weight_mg >= 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')), closed_at TEXT
);
CREATE TABLE package_items (
  id TEXT PRIMARY KEY, package_id TEXT NOT NULL REFERENCES packages(id) ON DELETE RESTRICT,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT, scanned_at TEXT NOT NULL,
  scanned_by_user_id TEXT REFERENCES users(id) ON DELETE RESTRICT,
  weight_mg_snapshot INTEGER NOT NULL CHECK (weight_mg_snapshot >= 0),
  purity_per_mille_snapshot INTEGER NOT NULL CHECK (purity_per_mille_snapshot BETWEEN 0 AND 1000),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (package_id, product_id)
);
CREATE TABLE return_sessions (
  id TEXT PRIMARY KEY, status TEXT NOT NULL CHECK (status IN ('open', 'stopped', 'completed')),
  operator_user_id TEXT REFERENCES users(id) ON DELETE RESTRICT, started_at TEXT NOT NULL, ended_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (ended_at IS NULL OR ended_at >= started_at)
);
CREATE TABLE return_scans (
  id TEXT PRIMARY KEY, return_session_id TEXT NOT NULL REFERENCES return_sessions(id) ON DELETE RESTRICT,
  product_id TEXT REFERENCES products(id) ON DELETE RESTRICT,
  scanned_code TEXT NOT NULL CHECK (length(trim(scanned_code)) > 0),
  scan_status TEXT NOT NULL CHECK (scan_status IN ('accepted', 'duplicate', 'rejected')),
  weight_mg_snapshot INTEGER CHECK (weight_mg_snapshot IS NULL OR weight_mg_snapshot >= 0),
  scanned_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (scan_status <> 'accepted' OR (product_id IS NOT NULL AND weight_mg_snapshot IS NOT NULL))
);
CREATE TABLE device_settings (
  id TEXT PRIMARY KEY, device_type TEXT NOT NULL UNIQUE CHECK (device_type IN ('printer', 'scanner', 'scale')),
  display_name TEXT NOT NULL, connection_status TEXT NOT NULL DEFAULT 'disconnected'
    CHECK (connection_status IN ('connected', 'disconnected', 'ready', 'error')),
  connection_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(connection_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE TABLE printer_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1), device_settings_id TEXT REFERENCES device_settings(id) ON DELETE RESTRICT,
  printer_name TEXT, label_width_mm INTEGER CHECK (label_width_mm IS NULL OR label_width_mm > 0),
  label_height_mm INTEGER CHECK (label_height_mm IS NULL OR label_height_mm > 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE TABLE scanner_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1), device_settings_id TEXT REFERENCES device_settings(id) ON DELETE RESTRICT,
  scanner_type TEXT, scan_mode TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE TABLE scale_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1), device_settings_id TEXT REFERENCES device_settings(id) ON DELETE RESTRICT,
  scale_model TEXT, port_name TEXT, baud_rate INTEGER CHECK (baud_rate IS NULL OR baud_rate > 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE TABLE backup_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1), is_enabled INTEGER NOT NULL DEFAULT 0 CHECK (is_enabled IN (0, 1)),
  interval_minutes INTEGER NOT NULL DEFAULT 1440 CHECK (interval_minutes > 0), destination_path TEXT, last_backup_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE TABLE app_settings (
  setting_key TEXT PRIMARY KEY, value_json TEXT NOT NULL CHECK (json_valid(value_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE UNIQUE INDEX product_groups_active_name_unique ON product_groups(name) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX main_categories_active_group_name_unique ON main_categories(product_group_id, name) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX workshops_active_name_unique ON workshops(name) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX users_active_username_unique ON users(username) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX products_active_code_unique ON products(product_code) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX label_templates_default_kind_unique ON label_templates(template_kind) WHERE is_default = 1 AND is_active = 1;
CREATE UNIQUE INDEX return_scans_accepted_product_session_unique ON return_scans(return_session_id, product_id)
  WHERE scan_status = 'accepted' AND product_id IS NOT NULL;
CREATE INDEX main_categories_group_index ON main_categories(product_group_id);
CREATE INDEX products_group_index ON products(product_group_id);
CREATE INDEX products_category_index ON products(main_category_id);
CREATE INDEX products_workshop_index ON products(workshop_id);
CREATE INDEX products_template_index ON products(label_template_id);
CREATE INDEX package_items_package_index ON package_items(package_id);
CREATE INDEX package_items_product_index ON package_items(product_id);
CREATE INDEX return_scans_session_index ON return_scans(return_session_id);
CREATE INDEX return_scans_product_index ON return_scans(product_id);
