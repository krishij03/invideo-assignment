use wasm_bindgen::prelude::*;

// Hello World example to verify WASM is working
#[wasm_bindgen]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! WASM is working! 🎉", name)
}

// Example function showing how to work with numbers
#[wasm_bindgen]
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}
