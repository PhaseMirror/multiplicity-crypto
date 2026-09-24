import { describe, expect, it, test } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DirectionalAead,
  buildNonce,
  computeHmac,
  computeTranscript,
  deriveDirectionalKeys,
  deriveNoncePrefixes,
  encodeFrame,
  hkdfExpand,
  hkdfExtract,
  initializeTranscript,
  packBasis,
  traceSequence
} from '../protocol';

const here = dirname(fileURLToPath(import.meta.url));
const manifestPath = resolve(here, '../../../vectors/protocol.json');
const manifest: {
  schema: number;
  mechanisms: string[];
  languages: string[];
  vectors: Array<{
    id: string;
    mechanism: string;
    operation: string;
    inputs: Record<string, any>;
    expected: Record<string, any>;
  }>;
} = JSON.parse(readFileSync(manifestPath, 'utf8'));

const hex = (value: Buffer): string => value.toString('hex');

function compute(operation: string, inputs: Record<string, any>): Record<string, any> {
  switch (operation) {
    case 'sha256':
      return { out: createHash('sha256').update(Buffer.from(inputs.data, 'hex')).digest('hex') };

    case 'hkdf_extract':
      return {
        out: hex(hkdfExtract(Buffer.from(inputs.ikm, 'hex'), Buffer.from(inputs.salt, 'hex')))
      };

    case 'hkdf_expand':
      return {
        out: hex(
          hkdfExpand(
            Buffer.from(inputs.prk, 'hex'),
            Buffer.from(inputs.info, 'hex'),
            inputs.length
          )
        )
      };

    case 'hmac_sha256':
      return {
        out: hex(computeHmac(Buffer.from(inputs.key, 'hex'), Buffer.from(inputs.data, 'hex')))
      };

    case 'frame_encode':
      return {
        out: hex(
          encodeFrame({
            messageType: inputs.message_type,
            sequence: inputs.sequence,
            payload: Buffer.from(inputs.payload, 'hex')
          })
        )
      };

    case 'session_id':
      return {
        out: hex(
          initializeTranscript(
            Buffer.from(inputs.nonceA, 'hex'),
            Buffer.from(inputs.nonceB, 'hex')
          ).sid
        )
      };

    case 'transcript': {
      const result = computeTranscript({
        nonceA: Buffer.from(inputs.nonceA, 'hex'),
        nonceB: Buffer.from(inputs.nonceB, 'hex'),
        version: inputs.version,
        messagesA: inputs.messagesA.map((message: string) => Buffer.from(message, 'hex')),
        messagesB: inputs.messagesB.map((message: string) => Buffer.from(message, 'hex'))
      });
      return {
        sid: hex(result.sid),
        h_a: hex(result.hA),
        h_b: hex(result.hB),
        context_hash: hex(result.contextHash)
      };
    }

    case 'sequence_trace': {
      const result = traceSequence(inputs.sequences);
      return {
        outcomes: result.outcomes.join(''),
        accepted: result.acceptedCount,
        next_expected: result.finalNextExpectedSequence,
        aborted: result.aborted
      };
    }

    case 'pack_basis':
      return { out: packBasis(inputs.bases).toString(16).padStart(2, '0') };

    case 'directional_keys': {
      const keys = deriveDirectionalKeys(
        Buffer.from(inputs.ikm, 'hex'),
        Buffer.from(inputs.context, 'hex'),
        Buffer.from(inputs.salt, 'hex')
      );
      return { k_a2b: hex(keys.K_enc_A2B), k_b2a: hex(keys.K_enc_B2A) };
    }

    case 'nonce_prefixes': {
      const prefixes = deriveNoncePrefixes(
        { K_enc_A2B: Buffer.from(inputs.k_a2b, 'hex'), K_enc_B2A: Buffer.from(inputs.k_b2a, 'hex') },
        Buffer.from(inputs.context, 'hex')
      );
      return { a2b: hex(prefixes.A2B), b2a: hex(prefixes.B2A) };
    }

    case 'build_nonce':
      return { out: hex(buildNonce(Buffer.from(inputs.prefix, 'hex'), inputs.sequence)) };

    case 'aead_encrypt': {
      const cipher = new DirectionalAead(
        Buffer.from(inputs.key, 'hex'),
        Buffer.from(inputs.context, 'hex'),
        inputs.direction
      );
      const output = cipher.encrypt(
        Buffer.from(inputs.plaintext, 'hex'),
        Buffer.from(inputs.aad, 'hex')
      );
      return { out: hex(Buffer.concat([output.ciphertext, output.authenticationTag])) };
    }

    default:
      throw new Error(`unsupported vector operation: ${operation}`);
  }
}

if (process.env.DIFF_VECTORS_UPDATE === '1') {
  const updated = manifest.vectors.map((vector) => ({
    ...vector,
    expected: compute(vector.operation, vector.inputs)
  }));
  writeFileSync(
    manifestPath,
    `${JSON.stringify({ ...manifest, vectors: updated }, null, 2)}\n`,
    'utf8'
  );
}

describe('ADR-084 vector manifest', () => {
  it('is a well-formed conformance manifest', () => {
    expect(manifest.schema).toBe(1);
    expect(new Set(manifest.vectors.map((vector) => vector.id)).size).toBe(
      manifest.vectors.length
    );
    expect(manifest.mechanisms).toEqual(expect.arrayContaining(['shipped', 'specified']));
    expect(manifest.languages.length).toBeGreaterThanOrEqual(3);
    for (const vector of manifest.vectors) {
      expect(['shipped', 'specified']).toContain(vector.mechanism);
      expect(typeof vector.operation).toBe('string');
      expect(vector.inputs).toBeTruthy();
      expect(vector.expected).toBeTruthy();
    }
  });

  it('covers both required mechanisms', () => {
    for (const mechanism of ['shipped', 'specified']) {
      expect(manifest.vectors.filter((vector) => vector.mechanism === mechanism).length).toBeGreaterThan(0);
    }
  });

  test.each(manifest.vectors.filter((vector) => vector.mechanism === 'shipped'))(
    'shipped primitive vector $id matches protocol.ts',
    (vector) => {
      expect(compute(vector.operation, vector.inputs)).toEqual(vector.expected);
    }
  );

  test.each(manifest.vectors.filter((vector) => vector.mechanism === 'specified'))(
    'specified wire-structure vector $id matches protocol.ts',
    (vector) => {
      expect(compute(vector.operation, vector.inputs)).toEqual(vector.expected);
    }
  );
});