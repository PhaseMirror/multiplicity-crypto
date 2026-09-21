import os
import sys
import hashlib

EXPECTED_HASH = '8f3ea7510a79bbb7e3376c19f1f59f9253ae29c53eac3c11fc581c5d5fe28166'
WASM_PATH = os.path.join(os.path.dirname(__file__), '../../../../rust/pkg/multiplicity_crypto_rust_bg.wasm')

def load_wasm_fail_closed():
    if not os.path.exists(WASM_PATH):
        print(f"ADR-075 Strict Cryptographic Boundary Violation: WASM package missing at {WASM_PATH}")
        sys.exit(1)
        
    with open(WASM_PATH, 'rb') as f:
        wasm_buffer = f.read()
        
    file_hash = hashlib.sha256(wasm_buffer).hexdigest()
    
    if file_hash != EXPECTED_HASH:
        print(f"ADR-075 Strict Cryptographic Boundary Violation: WASM hash mismatch.\nExpected: {EXPECTED_HASH}\nGot:      {file_hash}")
        sys.exit(1)
        
    # Boundary passed.
    # In a full Python environment, we would load this via wasmtime or a Python native binding.
    return True
