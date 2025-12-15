use wasm_bindgen::prelude::*;
use std::alloc::{alloc, dealloc, Layout};

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

// ==========================================
// Memory Management for Zero-Copy Processing
// ==========================================

/// Allocate memory in WASM linear memory and return pointer
#[wasm_bindgen]
pub fn alloc_buffer(size: usize) -> *mut u8 {
    let layout = Layout::from_size_align(size, 1).expect("Invalid layout");
    unsafe { alloc(layout) }
}

/// Free previously allocated memory
#[wasm_bindgen]
pub fn free_buffer(ptr: *mut u8, size: usize) {
    if ptr.is_null() {
        return;
    }
    let layout = Layout::from_size_align(size, 1).expect("Invalid layout");
    unsafe { dealloc(ptr, layout) };
}

// ==========================================
// Image Filter Functions
// ==========================================

/// Apply grayscale filter in-place
/// Data format: RGBA (4 bytes per pixel)
#[wasm_bindgen]
pub fn apply_grayscale(ptr: *mut u8, len: usize) {
    let data = unsafe { std::slice::from_raw_parts_mut(ptr, len) };
    
    for i in (0..len).step_by(4) {
        if i + 2 >= len {
            break;
        }
        let r = data[i] as f32;
        let g = data[i + 1] as f32;
        let b = data[i + 2] as f32;
        // Luminosity method
        let gray = (0.299 * r + 0.587 * g + 0.114 * b) as u8;
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
        // Alpha channel unchanged
    }
}

/// Apply invert filter in-place
#[wasm_bindgen]
pub fn apply_invert(ptr: *mut u8, len: usize) {
    let data = unsafe { std::slice::from_raw_parts_mut(ptr, len) };
    
    for i in (0..len).step_by(4) {
        if i + 2 >= len {
            break;
        }
        data[i] = 255 - data[i];
        data[i + 1] = 255 - data[i + 1];
        data[i + 2] = 255 - data[i + 2];
        // Alpha channel unchanged
    }
}

/// Apply sepia filter in-place
/// intensity: 0-100 (percentage)
#[wasm_bindgen]
pub fn apply_sepia(ptr: *mut u8, len: usize, intensity: u8) {
    let data = unsafe { std::slice::from_raw_parts_mut(ptr, len) };
    let factor = (intensity as f32) / 100.0;
    
    for i in (0..len).step_by(4) {
        if i + 2 >= len {
            break;
        }
        let r = data[i] as f32;
        let g = data[i + 1] as f32;
        let b = data[i + 2] as f32;
        
        let tr = 0.393 * r + 0.769 * g + 0.189 * b;
        let tg = 0.349 * r + 0.686 * g + 0.168 * b;
        let tb = 0.272 * r + 0.534 * g + 0.131 * b;
        
        data[i] = (r + (tr - r) * factor).min(255.0) as u8;
        data[i + 1] = (g + (tg - g) * factor).min(255.0) as u8;
        data[i + 2] = (b + (tb - b) * factor).min(255.0) as u8;
    }
}

/// Adjust brightness in-place
/// adjustment: -100 to 100
#[wasm_bindgen]
pub fn apply_brightness(ptr: *mut u8, len: usize, adjustment: i32) {
    let data = unsafe { std::slice::from_raw_parts_mut(ptr, len) };
    
    for i in (0..len).step_by(4) {
        if i + 2 >= len {
            break;
        }
        data[i] = ((data[i] as i32 + adjustment).max(0).min(255)) as u8;
        data[i + 1] = ((data[i + 1] as i32 + adjustment).max(0).min(255)) as u8;
        data[i + 2] = ((data[i + 2] as i32 + adjustment).max(0).min(255)) as u8;
    }
}

/// Adjust contrast in-place
/// factor: 0-200 (100 = no change)
#[wasm_bindgen]
pub fn apply_contrast(ptr: *mut u8, len: usize, factor: u8) {
    let data = unsafe { std::slice::from_raw_parts_mut(ptr, len) };
    let f = (factor as f32 - 100.0) / 100.0;
    let contrast_factor = (259.0 * (f * 255.0 + 255.0)) / (255.0 * (259.0 - f * 255.0));
    
    for i in (0..len).step_by(4) {
        if i + 2 >= len {
            break;
        }
        data[i] = (contrast_factor * (data[i] as f32 - 128.0) + 128.0).max(0.0).min(255.0) as u8;
        data[i + 1] = (contrast_factor * (data[i + 1] as f32 - 128.0) + 128.0).max(0.0).min(255.0) as u8;
        data[i + 2] = (contrast_factor * (data[i + 2] as f32 - 128.0) + 128.0).max(0.0).min(255.0) as u8;
    }
}

/// Apply simple box blur in-place
/// radius: blur radius (1-10 recommended)
#[wasm_bindgen]
pub fn apply_blur(ptr: *mut u8, len: usize, width: u32, height: u32, radius: u32) {
    let data = unsafe { std::slice::from_raw_parts_mut(ptr, len) };
    let width = width as usize;
    let height = height as usize;
    let radius = radius.max(1).min(10) as usize;
    
    // Create a copy for reading
    let original: Vec<u8> = data.to_vec();
    
    for y in 0..height {
        for x in 0..width {
            let mut r_sum: u32 = 0;
            let mut g_sum: u32 = 0;
            let mut b_sum: u32 = 0;
            let mut count: u32 = 0;
            
            // Sample neighboring pixels
            let y_start = y.saturating_sub(radius);
            let y_end = (y + radius + 1).min(height);
            let x_start = x.saturating_sub(radius);
            let x_end = (x + radius + 1).min(width);
            
            for ny in y_start..y_end {
                for nx in x_start..x_end {
                    let idx = (ny * width + nx) * 4;
                    if idx + 2 < len {
                        r_sum += original[idx] as u32;
                        g_sum += original[idx + 1] as u32;
                        b_sum += original[idx + 2] as u32;
                        count += 1;
                    }
                }
            }
            
            if count > 0 {
                let idx = (y * width + x) * 4;
                if idx + 2 < len {
                    data[idx] = (r_sum / count) as u8;
                    data[idx + 1] = (g_sum / count) as u8;
                    data[idx + 2] = (b_sum / count) as u8;
                }
            }
        }
    }
}

/// Apply saturation adjustment in-place
/// factor: 0-200 (100 = no change, 0 = grayscale)
#[wasm_bindgen]
pub fn apply_saturation(ptr: *mut u8, len: usize, factor: u8) {
    let data = unsafe { std::slice::from_raw_parts_mut(ptr, len) };
    let sat = (factor as f32) / 100.0;
    
    for i in (0..len).step_by(4) {
        if i + 2 >= len {
            break;
        }
        let r = data[i] as f32;
        let g = data[i + 1] as f32;
        let b = data[i + 2] as f32;
        
        let gray = 0.299 * r + 0.587 * g + 0.114 * b;
        
        data[i] = (gray + sat * (r - gray)).max(0.0).min(255.0) as u8;
        data[i + 1] = (gray + sat * (g - gray)).max(0.0).min(255.0) as u8;
        data[i + 2] = (gray + sat * (b - gray)).max(0.0).min(255.0) as u8;
    }
}

/// Apply hue rotation in-place
/// degrees: 0-360
#[wasm_bindgen]
pub fn apply_hue_rotate(ptr: *mut u8, len: usize, degrees: f32) {
    let data = unsafe { std::slice::from_raw_parts_mut(ptr, len) };
    let angle = degrees * std::f32::consts::PI / 180.0;
    let cos_a = angle.cos();
    let sin_a = angle.sin();
    
    // Rotation matrix for hue
    let matrix = [
        0.213 + 0.787 * cos_a - 0.213 * sin_a,
        0.715 - 0.715 * cos_a - 0.715 * sin_a,
        0.072 - 0.072 * cos_a + 0.928 * sin_a,
        0.213 - 0.213 * cos_a + 0.143 * sin_a,
        0.715 + 0.285 * cos_a + 0.140 * sin_a,
        0.072 - 0.072 * cos_a - 0.283 * sin_a,
        0.213 - 0.213 * cos_a - 0.787 * sin_a,
        0.715 - 0.715 * cos_a + 0.715 * sin_a,
        0.072 + 0.928 * cos_a + 0.072 * sin_a,
    ];
    
    for i in (0..len).step_by(4) {
        if i + 2 >= len {
            break;
        }
        let r = data[i] as f32;
        let g = data[i + 1] as f32;
        let b = data[i + 2] as f32;
        
        data[i] = (matrix[0] * r + matrix[1] * g + matrix[2] * b).max(0.0).min(255.0) as u8;
        data[i + 1] = (matrix[3] * r + matrix[4] * g + matrix[5] * b).max(0.0).min(255.0) as u8;
        data[i + 2] = (matrix[6] * r + matrix[7] * g + matrix[8] * b).max(0.0).min(255.0) as u8;
    }
}

/// Apply posterize effect (reduce color depth)
/// levels: 2-16
#[wasm_bindgen]
pub fn apply_posterize(ptr: *mut u8, len: usize, levels: u8) {
    let data = unsafe { std::slice::from_raw_parts_mut(ptr, len) };
    let levels = levels.max(2).min(16) as f32;
    let divisor = 256.0 / levels;
    
    for i in (0..len).step_by(4) {
        if i + 2 >= len {
            break;
        }
        data[i] = ((data[i] as f32 / divisor).floor() * divisor) as u8;
        data[i + 1] = ((data[i + 1] as f32 / divisor).floor() * divisor) as u8;
        data[i + 2] = ((data[i + 2] as f32 / divisor).floor() * divisor) as u8;
    }
}

/// Apply threshold (convert to black/white based on threshold)
/// threshold: 0-255
#[wasm_bindgen]
pub fn apply_threshold(ptr: *mut u8, len: usize, threshold: u8) {
    let data = unsafe { std::slice::from_raw_parts_mut(ptr, len) };
    
    for i in (0..len).step_by(4) {
        if i + 2 >= len {
            break;
        }
        let r = data[i] as f32;
        let g = data[i + 1] as f32;
        let b = data[i + 2] as f32;
        let gray = (0.299 * r + 0.587 * g + 0.114 * b) as u8;
        let value = if gray > threshold { 255 } else { 0 };
        data[i] = value;
        data[i + 1] = value;
        data[i + 2] = value;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_grayscale() {
        let mut data = vec![255, 0, 0, 255, 0, 255, 0, 255]; // Red, Green
        apply_grayscale(data.as_mut_ptr(), data.len());
        // Red should become gray (approx 76)
        assert!(data[0] < 80 && data[0] > 70);
        assert_eq!(data[0], data[1]);
        assert_eq!(data[1], data[2]);
    }

    #[test]
    fn test_invert() {
        let mut data = vec![255, 0, 128, 255];
        apply_invert(data.as_mut_ptr(), data.len());
        assert_eq!(data[0], 0);
        assert_eq!(data[1], 255);
        assert_eq!(data[2], 127);
        assert_eq!(data[3], 255); // Alpha unchanged
    }
}
