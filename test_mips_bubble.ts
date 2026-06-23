import { assemble } from './src/engine/mipsParser';
import { MIPSPipelineEngine } from './src/engine/pipelineEngine';

const mipsCode = `
# Bubble Sort
# Sorts an array of integers in ascending order

.data
array:  .word 64, 25, 12, 22, 11, 90, 45, 33
size:   .word 8
newline: .asciiz "\\n"

.text
main:
  la    $s0, array       # $s0 = base address
  lw    $s1, size        # $s1 = array size (label resolved)
  addi  $s1, $zero, 8   # size = 8

outer:
  addi  $t0, $zero, 0   # swapped = false
  addi  $t1, $zero, 0   # i = 0
  addi  $t2, $s1, -1    # limit = size - 1

inner:
  beq   $t1, $t2, check_swap

  # Load array[i] and array[i+1]
  sll   $t3, $t1, 2     # offset = i * 4
  add   $t3, $s0, $t3   # addr = base + offset
  lw    $t4, 0($t3)     # array[i]
  lw    $t5, 4($t3)     # array[i+1]

  # Compare and swap if needed
  slt   $t6, $t5, $t4   # if array[i+1] < array[i]
  beq   $t6, $zero, no_swap

  sw    $t5, 0($t3)     # swap: array[i] = array[i+1]
  sw    $t4, 4($t3)     # swap: array[i+1] = array[i]
  addi  $t0, $zero, 1   # swapped = true

no_swap:
  addi  $t1, $t1, 1     # i++
  j     inner

check_swap:
  bne   $t0, $zero, outer  # if swapped, repeat

  # Print sorted array
  addi  $t1, $zero, 0
print_loop:
  beq   $t1, $s1, done
  sll   $t3, $t1, 2
  add   $t3, $s0, $t3
  lw    $a0, 0($t3)
  li    $v0, 1
  syscall
  li    $v0, 11          # print space
  li    $a0, 32
  syscall
  addi  $t1, $t1, 1
  j     print_loop

done:
  li    $v0, 10
  syscall
`;

const result = assemble(mipsCode);
console.log('Errors:', result.errors);
const engine = new MIPSPipelineEngine();
engine.loadDataSegment(result.dataSegment);
engine.loadProgram(result.instructions);

while (!engine.step().finished && engine.cycle < 1000) {
}

console.log('Cycles:', engine.cycle);
console.log('Termination:', engine['terminationReason']);
console.log('Registers v0:', engine['registers'][2]);
