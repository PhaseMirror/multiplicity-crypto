/* tslint:disable */
/* eslint-disable */

export class PedersenCommitment {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Commits to a value `v` with a blinding factor `r`: C = v*G + r*H
     */
    commit(v: bigint): string;
    commit_with_blind(v: bigint, r_bytes: Uint8Array): string;
    constructor();
}
