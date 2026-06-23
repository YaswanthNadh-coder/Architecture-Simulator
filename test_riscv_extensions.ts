import { assembleRISCV } from './src/engine/riscvParser';
import { MIPSPipelineEngine } from './src/engine/pipelineEngine';

const rvTestCode = `
.text
main:
  # 1. RV32M Tests
  li a0, 20
  li a1, 3
  mul a2, a0, a1      # a2 = 60
  div a3, a0, a1      # a3 = 6
  rem a4, a0, a1      # a4 = 2

  # 2. Pseudo-instructions
  li t0, 0
  seqz t1, t0         # t1 = 1
  snez t2, t0         # t2 = 0
  li t3, -5
  sltz t4, t3         # t4 = 1
  sgtz t5, t3         # t5 = 0
  neg t6, t3          # t6 = 5
  not a5, zero        # a5 = -1

  # 3. Branch Pseudo-instructions
  li a0, 5
  bgtz a0, test_bgtz
  ebreak

test_bgtz:
  li a0, -1
  bltz a0, test_bltz
  ebreak

test_bltz:
  # 4. CSR
  li t0, 42
  csrrw a0, 10, t0    # Write 42 to CSR 10, a0 = old value (0)
  csrrs a1, 10, zero  # Read CSR 10 into a1, should be 42

  # 5. EBREAK
  ebreak

  # Should not reach here
  li a0, 999
`;

console.log("Assembling RV32IMAC code...");
const result = assembleRISCV(rvTestCode);
if (result.errors.length > 0) {
  console.error("Assembly errors:", result.errors);
  process.exit(1);
}

const engine = new MIPSPipelineEngine();
engine.maxCycles = 1000;
engine.loadDataSegment(result.dataSegment);
engine.loadProgram(result.instructions);

console.log("Running simulation...");
while (!engine.step().finished) {
  // run until finished
}

const snapshot = engine.step(); // Get final snapshot
console.log("Simulation finished. Reason:", snapshot.terminationReason);

console.log("Checking Results:");
const regs = snapshot.registers;
console.log(`RV32M mul (20 * 3 = 60): a2 = ${regs[12]}`);
console.log(`RV32M div (20 / 3 = 6): a3 = ${regs[13]}`);
console.log(`RV32M rem (20 % 3 = 2): a4 = ${regs[14]}`);
console.log(`seqz (t0=0): t1 = ${regs[6]}`);
console.log(`sltz (-5 < 0): t4 = ${regs[29]}`);
console.log(`neg (-(-5)): t6 = ${regs[31]}`);
console.log(`not (~0): a5 = ${regs[15]}`);
console.log(`CSR read: a1 = ${regs[11]}`);

if (regs[12] !== 60 || regs[13] !== 6 || regs[14] !== 2 || regs[6] !== 1 || regs[29] !== 1 || regs[31] !== 5 || regs[15] !== -1 || regs[11] !== 42) {
  console.error("TEST FAILED!");
  process.exit(1);
} else {
  console.log("ALL TESTS PASSED!");
}
