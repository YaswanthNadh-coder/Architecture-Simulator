import { assembleRISCV } from './src/engine/riscvParser';
import { MIPSPipelineEngine } from './src/engine/pipelineEngine';

const rvTestCode = `
.data
# Define the array of 32-bit integers to be sorted
array:      .word   45, -7, 12, 89, 0, 3, -15, 22
# Calculate the total element count (8 items * 4 bytes each = 32 bytes)
size:       .word   8

.section .text
.global main

main:
    # 1. Initialize Base Pointers and Sizes
    la   s0, array          # s0 = base address of the array
    lw   s1, size           # s1 = total number of elements (N)
    
    li   t0, 0              # t0 = outer loop counter (i = 0)
    addi s2, s1, -1         # s2 = outer loop limit (N - 1)

outer_loop:
    # Check outer loop condition: if i >= N - 1, sorting is complete
    bge  t0, s2, end_sort   
    
    li   t1, 0              # t1 = inner loop counter (j = 0)
    sub  s3, s2, t0         # s3 = inner loop limit (N - 1 - i)

inner_loop:
    # Check inner loop condition: if j >= N - 1 - i, exit inner loop
    bge  t1, s3, inner_done 

    # 2. Calculate Memory Addresses for Array Elements
    # Since each word is 4 bytes, offset = j * 4
    slli t2, t1, 2          # t2 = j * 4 (logical left shift by 2)
    add  t3, s0, t2         # t3 = address of array[j]
    
    # 3. Load Adjacent Elements
    lw   t4, 0(t3)          # t4 = array[j]
    lw   t5, 4(t3)          # t5 = array[j+1]

    # 4. Compare Elements (Ascending Order)
    # If array[j] <= array[j+1], they are in correct order. Skip swap.
    ble  t4, t5, no_swap    

    # 5. Swap Elements in Memory
    sw   t5, 0(t3)          # Store lower value into array[j]
    sw   t4, 4(t3)          # Store higher value into array[j+1]

no_swap:
    addi t1, t1, 1          # j++ (increment inner loop counter)
    j    inner_loop         # Repeat inner loop

inner_done:
    addi t0, t0, 1          # i++ (increment outer loop counter)
    j    outer_loop         # Repeat outer loop

end_sort:
    # Exit program execution
    li   a0, 0              # Set return code to 0
    li   a7, 93             # RISC-V Linux exit system call environment ID
    ecall                   # Environment call to exit
`;

const result = assembleRISCV(rvTestCode);
console.log('Errors:', result.errors);
console.log('Instructions:', result.instructions.length);

const engine = new MIPSPipelineEngine();
engine.maxCycles = 5000;
engine.loadDataSegment(result.dataSegment);
engine.loadProgram(result.instructions);

while (!engine.step().finished) {
}
console.log('Cycles:', engine.cycle);

const baseAddr = 0x10010000;
for (let i = 0; i < 8; i++) {
  const addr = baseAddr + i * 4;
  let word = engine['memory'].get(addr) ?? 0;
  word = (word << 24) | ((engine['memory'].get(addr+1)??0) << 16) | ((engine['memory'].get(addr+2)??0) << 8) | (engine['memory'].get(addr+3)??0);
  console.log(`array[${i}]:`, word | 0);
}
