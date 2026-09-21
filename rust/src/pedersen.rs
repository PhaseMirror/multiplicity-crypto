use ark_bn254::{Fr, G1Affine, G1Projective};
use ark_ec::{AffineRepr, CurveGroup, Group};
use ark_ff::{PrimeField, UniformRand};
use rand::rngs::OsRng;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct PedersenCommitment {
    g: G1Projective,
    h: G1Projective,
}

#[wasm_bindgen]
impl PedersenCommitment {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        // In a real setup, these would be generated via a trusted setup or hashing to the curve.
        // For production ADR-070 we generate them securely.
        let mut rng = OsRng;
        let g = G1Projective::rand(&mut rng);
        let h = G1Projective::rand(&mut rng);
        Self { g, h }
    }

    /// Commits to a value `v` with a blinding factor `r`: C = v*G + r*H
    pub fn commit(&self, v: u64) -> String {
        let mut rng = OsRng;
        let r = Fr::rand(&mut rng);
        let v_fr = Fr::from(v);

        let c = self.g * v_fr + self.h * r;
        let c_affine = c.into_affine();

        // Serialize to hex string for easy passing through WASM
        format!("{},{}", c_affine.x().unwrap(), c_affine.y().unwrap())
    }

    pub fn commit_with_blind(&self, v: u64, r_bytes: &[u8]) -> String {
        let r = Fr::from_le_bytes_mod_order(r_bytes);
        let v_fr = Fr::from(v);

        let c = self.g * v_fr + self.h * r;
        let c_affine = c.into_affine();

        format!("{},{}", c_affine.x().unwrap(), c_affine.y().unwrap())
    }
}
