/* tslint:disable */
/* eslint-disable */

export function add(a: number, b: number): number;

/**
 * Allocate memory in WASM linear memory and return pointer
 */
export function alloc_buffer(size: number): number;

/**
 * Apply simple box blur in-place
 * radius: blur radius (1-10 recommended)
 */
export function apply_blur(ptr: number, len: number, width: number, height: number, radius: number): void;

/**
 * Adjust brightness in-place
 * adjustment: -100 to 100
 */
export function apply_brightness(ptr: number, len: number, adjustment: number): void;

/**
 * Adjust contrast in-place
 * factor: 0-200 (100 = no change)
 */
export function apply_contrast(ptr: number, len: number, factor: number): void;

/**
 * Apply grayscale filter in-place
 * Data format: RGBA (4 bytes per pixel)
 */
export function apply_grayscale(ptr: number, len: number): void;

/**
 * Apply hue rotation in-place
 * degrees: 0-360
 */
export function apply_hue_rotate(ptr: number, len: number, degrees: number): void;

/**
 * Apply invert filter in-place
 */
export function apply_invert(ptr: number, len: number): void;

/**
 * Apply posterize effect (reduce color depth)
 * levels: 2-16
 */
export function apply_posterize(ptr: number, len: number, levels: number): void;

/**
 * Apply saturation adjustment in-place
 * factor: 0-200 (100 = no change, 0 = grayscale)
 */
export function apply_saturation(ptr: number, len: number, factor: number): void;

/**
 * Apply sepia filter in-place
 * intensity: 0-100 (percentage)
 */
export function apply_sepia(ptr: number, len: number, intensity: number): void;

/**
 * Apply threshold (convert to black/white based on threshold)
 * threshold: 0-255
 */
export function apply_threshold(ptr: number, len: number, threshold: number): void;

/**
 * Free previously allocated memory
 */
export function free_buffer(ptr: number, size: number): void;

export function greet(name: string): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly add: (a: number, b: number) => number;
  readonly alloc_buffer: (a: number) => number;
  readonly apply_blur: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly apply_brightness: (a: number, b: number, c: number) => void;
  readonly apply_contrast: (a: number, b: number, c: number) => void;
  readonly apply_grayscale: (a: number, b: number) => void;
  readonly apply_hue_rotate: (a: number, b: number, c: number) => void;
  readonly apply_invert: (a: number, b: number) => void;
  readonly apply_posterize: (a: number, b: number, c: number) => void;
  readonly apply_saturation: (a: number, b: number, c: number) => void;
  readonly apply_sepia: (a: number, b: number, c: number) => void;
  readonly apply_threshold: (a: number, b: number, c: number) => void;
  readonly free_buffer: (a: number, b: number) => void;
  readonly greet: (a: number, b: number) => [number, number];
  readonly __wbindgen_externrefs: WebAssembly.Table;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
