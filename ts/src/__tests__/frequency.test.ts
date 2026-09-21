import { computeFrequency } from '../frequency';

describe('Frequency mapping', () => {
  it('returns F_c, F_q, F_t', () => {
    const result = computeFrequency({
      x_t: Buffer.from('abc'),
      psi_t: Buffer.from('def'),
    });
    expect(result.F_c).toHaveLength(3);
    expect(result.F_q).toHaveLength(3);
    expect(result.F_t).toHaveLength(6);
  });

  it('F_c maps classical bytes to 32 bins', () => {
    const result = computeFrequency({ x_t: Buffer.from('a'), psi_t: Buffer.from('') });
    expect(result.F_c[0]).toBe(97 % 32);
  });

  it('F_q maps quantum bytes to 16 bins', () => {
    const result = computeFrequency({ x_t: Buffer.from(''), psi_t: Buffer.from('a') });
    expect(result.F_q[0]).toBe(97 % 16);
  });

  it('F_t concatenates F_c and F_q', () => {
    const x = Buffer.from('ab');
    const psi = Buffer.from('cd');
    const result = computeFrequency({ x_t: x, psi_t: psi });
    expect(result.F_t.slice(0, 2)).toEqual(result.F_c);
    expect(result.F_t.slice(2)).toEqual(result.F_q);
  });

  it('deterministic for same input', () => {
    const r1 = computeFrequency({ x_t: Buffer.from('test'), psi_t: Buffer.from('data') });
    const r2 = computeFrequency({ x_t: Buffer.from('test'), psi_t: Buffer.from('data') });
    expect(r1.F_c).toEqual(r2.F_c);
    expect(r1.F_q).toEqual(r2.F_q);
    expect(r1.F_t).toEqual(r2.F_t);
  });
});
