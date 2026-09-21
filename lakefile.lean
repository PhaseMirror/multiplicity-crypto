import Lake
open Lake DSL

package «multiplicity-crypto» where
  version := v!"0.1.0"
  srcDir := "lean"

@[default_target]
lean_lib MultiplicityCrypto where
  roots := #[`MultiplicityCrypto.Protocol]
