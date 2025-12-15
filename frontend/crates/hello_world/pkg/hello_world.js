let wasm;

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    }
}

let WASM_VECTOR_LEN = 0;

/**
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export function add(a, b) {
    const ret = wasm.add(a, b);
    return ret;
}

/**
 * Allocate memory in WASM linear memory and return pointer
 * @param {number} size
 * @returns {number}
 */
export function alloc_buffer(size) {
    const ret = wasm.alloc_buffer(size);
    return ret >>> 0;
}

/**
 * Apply simple box blur in-place
 * radius: blur radius (1-10 recommended)
 * @param {number} ptr
 * @param {number} len
 * @param {number} width
 * @param {number} height
 * @param {number} radius
 */
export function apply_blur(ptr, len, width, height, radius) {
    wasm.apply_blur(ptr, len, width, height, radius);
}

/**
 * Adjust brightness in-place
 * adjustment: -100 to 100
 * @param {number} ptr
 * @param {number} len
 * @param {number} adjustment
 */
export function apply_brightness(ptr, len, adjustment) {
    wasm.apply_brightness(ptr, len, adjustment);
}

/**
 * Adjust contrast in-place
 * factor: 0-200 (100 = no change)
 * @param {number} ptr
 * @param {number} len
 * @param {number} factor
 */
export function apply_contrast(ptr, len, factor) {
    wasm.apply_contrast(ptr, len, factor);
}

/**
 * Apply grayscale filter in-place
 * Data format: RGBA (4 bytes per pixel)
 * @param {number} ptr
 * @param {number} len
 */
export function apply_grayscale(ptr, len) {
    wasm.apply_grayscale(ptr, len);
}

/**
 * Apply hue rotation in-place
 * degrees: 0-360
 * @param {number} ptr
 * @param {number} len
 * @param {number} degrees
 */
export function apply_hue_rotate(ptr, len, degrees) {
    wasm.apply_hue_rotate(ptr, len, degrees);
}

/**
 * Apply invert filter in-place
 * @param {number} ptr
 * @param {number} len
 */
export function apply_invert(ptr, len) {
    wasm.apply_invert(ptr, len);
}

/**
 * Apply posterize effect (reduce color depth)
 * levels: 2-16
 * @param {number} ptr
 * @param {number} len
 * @param {number} levels
 */
export function apply_posterize(ptr, len, levels) {
    wasm.apply_posterize(ptr, len, levels);
}

/**
 * Apply saturation adjustment in-place
 * factor: 0-200 (100 = no change, 0 = grayscale)
 * @param {number} ptr
 * @param {number} len
 * @param {number} factor
 */
export function apply_saturation(ptr, len, factor) {
    wasm.apply_saturation(ptr, len, factor);
}

/**
 * Apply sepia filter in-place
 * intensity: 0-100 (percentage)
 * @param {number} ptr
 * @param {number} len
 * @param {number} intensity
 */
export function apply_sepia(ptr, len, intensity) {
    wasm.apply_sepia(ptr, len, intensity);
}

/**
 * Apply threshold (convert to black/white based on threshold)
 * threshold: 0-255
 * @param {number} ptr
 * @param {number} len
 * @param {number} threshold
 */
export function apply_threshold(ptr, len, threshold) {
    wasm.apply_threshold(ptr, len, threshold);
}

/**
 * Free previously allocated memory
 * @param {number} ptr
 * @param {number} size
 */
export function free_buffer(ptr, size) {
    wasm.free_buffer(ptr, size);
}

/**
 * @param {string} name
 * @returns {string}
 */
export function greet(name) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.greet(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

const EXPECTED_RESPONSE_TYPES = new Set(['basic', 'cors', 'default']);

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && EXPECTED_RESPONSE_TYPES.has(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else {
                    throw e;
                }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }
}

function __wbg_get_imports() {
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbindgen_init_externref_table = function() {
        const table = wasm.__wbindgen_externrefs;
        const offset = table.grow(4);
        table.set(0, undefined);
        table.set(offset + 0, undefined);
        table.set(offset + 1, null);
        table.set(offset + 2, true);
        table.set(offset + 3, false);
    };

    return imports;
}

function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    __wbg_init.__wbindgen_wasm_module = module;
    cachedUint8ArrayMemory0 = null;


    wasm.__wbindgen_start();
    return wasm;
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (typeof module !== 'undefined') {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (typeof module_or_path !== 'undefined') {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (typeof module_or_path === 'undefined') {
        module_or_path = new URL('hello_world_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync };
export default __wbg_init;
