mod migrations;

pub const DATABASE_URL: &str = "sqlite:gold-label-studio-pro.db";
pub const INITIAL_SCHEMA_SQL: &str = include_str!("../../migrations/0001_initial.sql");

pub use migrations::migrations;

#[cfg(test)]
mod tests;
