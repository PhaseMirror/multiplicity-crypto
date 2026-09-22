export interface IQKDBackend {
    getKey(input: QKDSimulatorInput): QKDSimulatorOutput | Promise<QKDSimulatorOutput>;
}
export declare class MockQKDBackend implements IQKDBackend {
    getKey(input: QKDSimulatorInput): QKDSimulatorOutput;
}
export declare class HardwareQKDBackend implements IQKDBackend {
    private endpoint;
    private saeId;
    constructor(endpoint: string, saeId: string);
    getKey(input: QKDSimulatorInput): Promise<QKDSimulatorOutput>;
}
import { MultiplicityProfile } from './multiplicity';
export interface QKDSimulatorInput {
    role: 'A' | 'B';
    context: Buffer;
    profile: MultiplicityProfile;
    sharedSecret: Buffer;
}
export interface QKDSimulatorOutput {
    simulatedKey: Buffer;
    label: string;
}
export declare function simulateQKD({ role, context, profile, sharedSecret }: QKDSimulatorInput): QKDSimulatorOutput;
