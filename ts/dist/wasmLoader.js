import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
const EXPECTED_HASH = '8f3ea7510a79bbb7e3376c19f1f59f9253ae29c53eac3c11fc581c5d5fe28166';
const WASM_PATH = path.resolve(__dirname, '../../rust/pkg/multiplicity_crypto_rust_bg.wasm');
export function loadWasmFailClosed() {
    try {
        if (!fs.existsSync(WASM_PATH)) {
            throw new Error(`ADR-075: Fail-closed. WASM package missing at ${WASM_PATH}`);
        }
        const wasmBuffer = fs.readFileSync(WASM_PATH);
        const hash = crypto.createHash('sha256').update(wasmBuffer).digest('hex');
        if (hash !== EXPECTED_HASH) {
            throw new Error(`ADR-075 Fail-closed: WASM hash mismatch.\nExpected: ${EXPECTED_HASH}\nGot:      ${hash}`);
        }
        // Hash matched, load the pkg module
        return require('../../rust/pkg/multiplicity_crypto_rust.js');
    }
    catch (e) {
        console.error("ADR-075 Strict Cryptographic Boundary Violation: " + e.message);
        process.exit(1);
    }
}
