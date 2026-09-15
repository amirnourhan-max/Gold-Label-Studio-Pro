// The installed application must behave like a normal Windows GUI program:
// without a subsystem attribute Rust builds a console binary, so Windows opens a
// console window behind the app and closing that window terminates the process.
// Debug builds keep the console so `cargo run` still prints diagnostics.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    gold_label_studio_pro_lib::run();
}
