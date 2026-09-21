export interface FrequencyInput {
    x_t: Buffer;
    psi_t: Buffer;
}
export interface FrequencyOutput {
    F_c: number[];
    F_q: number[];
    F_t: number[];
}
export declare function computeFrequency({ x_t, psi_t }: FrequencyInput): FrequencyOutput;
