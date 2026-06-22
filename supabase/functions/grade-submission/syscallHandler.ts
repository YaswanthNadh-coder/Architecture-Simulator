export interface SyscallIO {
  onPrint: (text: string) => void;
  onReadInt: () => Promise<number>;
  onReadString: (maxLen: number) => Promise<string>;
  onExit: () => void;
}

export interface SyscallResult {
  exit: boolean;
  waitForInput: boolean;
  registerWrites: Map<number, number>;
  outputText: string;
}

export const SYSCALL = {
  PRINT_INT: 1,
  PRINT_FLOAT: 2,
  PRINT_DOUBLE: 3,
  PRINT_STRING: 4,
  READ_INT: 5,
  READ_FLOAT: 6,
  READ_DOUBLE: 7,
  READ_STRING: 8,
  SBRK: 9,
  EXIT: 10,
  PRINT_CHAR: 11,
  READ_CHAR: 12,
  EXIT2: 17,
  PRINT_HEX: 34,
} as const;

export const SILENT_IO: SyscallIO = {
  onPrint: () => {},
  onReadInt: () => Promise.resolve(0),
  onReadString: () => Promise.resolve(''),
  onExit: () => {},
};

export function handleSyscall(
  v0: number,
  registers: Int32Array,
  memory: Map<number, number>,
): SyscallResult {
  const result: SyscallResult = {
    exit: false,
    waitForInput: false,
    registerWrites: new Map(),
    outputText: '',
  };

  switch (v0) {
    case SYSCALL.PRINT_INT: {
      result.outputText = String(registers[4]); // $a0
      break;
    }

    case SYSCALL.PRINT_STRING: {
      const addr = registers[4]; // $a0
      const bytes: number[] = [];
      let pos = addr;
      const maxLen = 4096;
      for (let i = 0; i < maxLen; i++) {
        const byte = memory.get(pos) ?? 0;
        if (byte === 0) break;
        bytes.push(byte);
        pos++;
      }
      const decoder = new TextDecoder('utf-8');
      result.outputText = decoder.decode(new Uint8Array(bytes));
      break;
    }

    case SYSCALL.READ_INT: {
      result.waitForInput = true;
      break;
    }

    case SYSCALL.READ_STRING: {
      result.waitForInput = true;
      break;
    }

    case SYSCALL.EXIT:
    case SYSCALL.EXIT2: {
      result.exit = true;
      break;
    }

    case SYSCALL.PRINT_CHAR: {
      const charCode = registers[4] & 0xFF; // $a0
      result.outputText = String.fromCharCode(charCode);
      break;
    }

    case SYSCALL.READ_CHAR: {
      result.waitForInput = true;
      break;
    }

    case SYSCALL.PRINT_HEX: {
      const val = registers[4] >>> 0;
      result.outputText = '0x' + val.toString(16).toUpperCase().padStart(8, '0');
      break;
    }

    case SYSCALL.SBRK: {
      result.registerWrites.set(2, 0x10040000); // $v0 = heap address
      break;
    }

    default: {
      result.outputText = `[Unknown syscall: ${v0}]\n`;
      break;
    }
  }

  return result;
}

export function completeSyscallInput(
  v0: number,
  inputValue: number | string,
  registers: Int32Array,
  memory: Map<number, number>,
): Map<number, number> {
  const writes = new Map<number, number>();

  switch (v0) {
    case SYSCALL.READ_INT: {
      const val = typeof inputValue === 'number' ? inputValue : parseInt(String(inputValue), 10) || 0;
      writes.set(2, val);
      break;
    }

    case SYSCALL.READ_CHAR: {
      const ch = typeof inputValue === 'string' ? inputValue.charCodeAt(0) : inputValue;
      writes.set(2, ch & 0xFF);
      break;
    }

    case SYSCALL.READ_STRING: {
      const addr = registers[4];
      const maxLen = registers[5];
      const str = String(inputValue);
      const encoder = new TextEncoder();
      const bytes = encoder.encode(str);
      const len = Math.min(bytes.length, maxLen - 1);
      for (let i = 0; i < len; i++) {
        memory.set(addr + i, bytes[i]);
      }
      memory.set(addr + len, 0);
      break;
    }
  }

  return writes;
}
