import { createServer, Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { HardwareQKDBackend, MockQKDBackend, simulateQKD, type QKDSimulatorInput } from '../qkd';
import { type MultiplicityProfile } from '../multiplicity';

const KEY_BYTES = 32;

function makeInput(role: 'A' | 'B', sharedSecret: Buffer): QKDSimulatorInput {
  const profile: MultiplicityProfile = {
    type: 1,
    version: 1,
    stateIndex: 123,
    prime_index: 3
  };
  return {
    role,
    context: Buffer.from('hardware-context', 'utf8'),
    profile,
    sharedSecret
  };
}

describe('HardwareQKDBackend (ETSI GS QKD 014 — mock endpoint)', () => {
  let server: Server;
  let baseUrl: string;
  let requestedPaths: string[] = [];
  let respond: (status: number, body: unknown) => void = () => {};

  const quantumKey = Buffer.alloc(KEY_BYTES, 0xab);
  const keyId = 'mock-etsi-014-key-0001';

  beforeAll(async () => {
    server = createServer((req, res) => {
      requestedPaths.push(req.url ?? '');
      const write = () => {
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(
          JSON.stringify({
            keys: [{ key: quantumKey.toString('base64'), key_ID: keyId }]
          })
        );
      };
      respond = (status: number, body: unknown) => {
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = status;
        res.end(JSON.stringify(body));
      };
      write();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  });

  beforeEach(() => {
    requestedPaths = [];
  });

  it('requests the enc endpoint for role A and passes the pipeline label through', async () => {
    const backend = new HardwareQKDBackend(baseUrl, 'sae-1');
    const out = await backend.getKey(makeInput('A', Buffer.alloc(KEY_BYTES, 0x11)));

    expect(requestedPaths).toEqual(['/api/v1/keys/sae-1/enc']);
    expect(out.label).toBe('HARDWARE_QKD_ETSI_014');
    expect(out.simulatedKey.equals(quantumKey)).toBe(false);
  });

  it('requests the dec endpoint for role B and derives the same key as simulateQKD with the label override', async () => {
    const backend = new HardwareQKDBackend(baseUrl, 'sae-2');
    const input = makeInput('B', Buffer.alloc(KEY_BYTES, 0x22));
    const out = await backend.getKey(input);

    expect(requestedPaths).toEqual(['/api/v1/keys/sae-2/dec']);
    const expected = simulateQKD({
      ...input,
      sharedSecret: quantumKey,
      keySourceLabel: 'HARDWARE_QKD_ETSI_014'
    });
    expect(out.simulatedKey.equals(expected.simulatedKey)).toBe(true);
    expect(out.label).toBe(expected.label);
  });

  it('does not mistake a hardware key for a mock (label differs by key source, key bytes identical)', async () => {
    const backend = new HardwareQKDBackend(baseUrl, 'sae-3');
    const input = makeInput('A', quantumKey);
    const hardwareOut = await backend.getKey(input);
    const mockOut = new MockQKDBackend().getKey(input);

    expect(hardwareOut.simulatedKey.equals(mockOut.simulatedKey)).toBe(true);
    expect(hardwareOut.label).toBe('HARDWARE_QKD_ETSI_014');
    expect(mockOut.label).toBe('SIMULATED_QKD');
  });

  it('throws a descriptor error when the endpoint is unreachable', async () => {
    const backend = new HardwareQKDBackend(`http://127.0.0.1:1`, 'sae-4');
    await expect(backend.getKey(makeInput('A', Buffer.alloc(KEY_BYTES)))).rejects.toThrow(
      /Hardware QKD fetch failed/
    );
  });

  it('throws when the endpoint returns no keys', async () => {
    const badServer = createServer((_req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      res.end(JSON.stringify({ keys: [] }));
    });
    await new Promise<void>((resolve) => badServer.listen(0, '127.0.0.1', resolve));
    const { port } = badServer.address() as AddressInfo;
    try {
      const backend = new HardwareQKDBackend(`http://127.0.0.1:${port}`, 'sae-5');
      await expect(backend.getKey(makeInput('A', Buffer.alloc(KEY_BYTES)))).rejects.toThrow(
        /QKD API returned no keys/
      );
    } finally {
      await new Promise<void>((resolve, reject) =>
        badServer.close((err) => (err ? reject(err) : resolve()))
      );
    }
  });

  it('throws when the endpoint returns a non-OK status', async () => {
    const failServer = createServer((_req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 503;
      res.end(JSON.stringify({ error: 'service unavailable' }));
    });
    await new Promise<void>((resolve) => failServer.listen(0, '127.0.0.1', resolve));
    const { port } = failServer.address() as AddressInfo;
    try {
      const backend = new HardwareQKDBackend(`http://127.0.0.1:${port}`, 'sae-6');
      await expect(backend.getKey(makeInput('A', Buffer.alloc(KEY_BYTES)))).rejects.toThrow(
        /Hardware QKD fetch failed/
      );
    } finally {
      await new Promise<void>((resolve, reject) =>
        failServer.close((err) => (err ? reject(err) : resolve()))
      );
    }
  });

  it('keeps the default pipeline label SIMULATED_QKD without the override', () => {
    const out = simulateQKD(makeInput('A', Buffer.alloc(KEY_BYTES, 0x33)));
    expect(out.label).toBe('SIMULATED_QKD');
  });
});