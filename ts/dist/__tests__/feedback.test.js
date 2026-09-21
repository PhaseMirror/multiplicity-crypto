import { computeFeedback, primeUpperBound } from '../feedback';
import { defaultProfile } from '../multiplicity';
describe('Feedback contractivity gate', () => {
    it('primeUpperBound returns p/(p+1)', () => {
        expect(primeUpperBound(0)).toBeCloseTo(2 / 3, 10);
        expect(primeUpperBound(3)).toBeCloseTo(7 / 8, 10);
    });
    it('transition occurs when contractivity is within bounds', () => {
        const profile = defaultProfile();
        const { transitioned } = computeFeedback({ currentProfile: profile, errorRate: 0.1, latency: 10, load: 0.5 }, { contractivity_score: 0.5 });
        expect(transitioned).toBe(true);
    });
    it('transition blocked when contractivity exceeds p/(p+1)', () => {
        const profile = { ...defaultProfile(), prime_index: 3 };
        const { transitioned } = computeFeedback({ currentProfile: profile, errorRate: 0.1, latency: 10, load: 0.5 }, { contractivity_score: 0.9 });
        expect(transitioned).toBe(false);
    });
    it('transition blocked when contractivity is non-positive', () => {
        const profile = defaultProfile();
        const { transitioned } = computeFeedback({ currentProfile: profile, errorRate: 0.1, latency: 10, load: 0.5 }, { contractivity_score: 0 });
        expect(transitioned).toBe(false);
    });
    it('profile increments on transition', () => {
        const profile = defaultProfile();
        const result = computeFeedback({ currentProfile: profile, errorRate: 0.1, latency: 10, load: 0.5 }, { contractivity_score: 0.5 });
        expect(result.nextProfile.stateIndex).toBe(1);
        expect(result.nextProfile.prime_index).toBe(1);
    });
    it('profile unchanged on blocked transition', () => {
        const profile = { ...defaultProfile(), stateIndex: 42 };
        const result = computeFeedback({ currentProfile: profile, errorRate: 0.1, latency: 10, load: 0.5 }, { contractivity_score: 2.0 });
        expect(result.nextProfile.stateIndex).toBe(42);
        expect(result.nextProfile.prime_index).toBe(0);
        expect(result.transitioned).toBe(false);
    });
});
