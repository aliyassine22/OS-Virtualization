"""
REAL hardware-assisted virtualization from ~150 lines of Python.

This talks directly to the Linux KVM API (/dev/kvm) with ioctl() calls - no
QEMU, no libvirt. It is a Python port of the classic "kvm-hello-world"
pattern (LWN, "Using the KVM API", 2015):

    1. open /dev/kvm, create a VM and one vCPU
    2. mmap a 64 KiB buffer and register it as the guest's "physical" RAM
    3. copy 16-bit real-mode machine code into guest RAM
    4. point the vCPU's CS:IP at it and call KVM_RUN in a loop
    5. every OUT instruction leaves VMX non-root mode (a VM EXIT with reason
       KVM_EXIT_IO); *we* are the VMM and emulate a serial port by printing
       the byte; HLT causes KVM_EXIT_HLT and we stop.

Requirements: Linux on x86-64, a CPU with VT-x or AMD-V enabled in firmware,
and read/write access to /dev/kvm (e.g. `sudo usermod -aG kvm $USER`).
Nested virtualization works too (e.g. a cloud VM with nested-virt enabled).
"""
from __future__ import annotations

import ctypes
import fcntl
import mmap
import os
import time

# ---------------------------------------------------------------- ioctl numbers
_IOC_WRITE, _IOC_READ = 1, 2
KVMIO = 0xAE


def _IO(nr):
    return (KVMIO << 8) | nr


def _IOC(direction, nr, size):
    return (direction << 30) | (size << 16) | (KVMIO << 8) | nr


class kvm_userspace_memory_region(ctypes.Structure):
    _fields_ = [("slot", ctypes.c_uint32), ("flags", ctypes.c_uint32),
                ("guest_phys_addr", ctypes.c_uint64), ("memory_size", ctypes.c_uint64),
                ("userspace_addr", ctypes.c_uint64)]


class kvm_regs(ctypes.Structure):
    _fields_ = [(n, ctypes.c_uint64) for n in
                ("rax rbx rcx rdx rsi rdi rsp rbp r8 r9 r10 r11 r12 r13 r14 r15 rip rflags").split()]


class kvm_segment(ctypes.Structure):
    _fields_ = [("base", ctypes.c_uint64), ("limit", ctypes.c_uint32), ("selector", ctypes.c_uint16),
                ("type", ctypes.c_uint8), ("present", ctypes.c_uint8), ("dpl", ctypes.c_uint8),
                ("db", ctypes.c_uint8), ("s", ctypes.c_uint8), ("l", ctypes.c_uint8),
                ("g", ctypes.c_uint8), ("avl", ctypes.c_uint8), ("unusable", ctypes.c_uint8),
                ("padding", ctypes.c_uint8)]


class kvm_dtable(ctypes.Structure):
    _fields_ = [("base", ctypes.c_uint64), ("limit", ctypes.c_uint16), ("padding", ctypes.c_uint16 * 3)]


class kvm_sregs(ctypes.Structure):
    _fields_ = [("cs", kvm_segment), ("ds", kvm_segment), ("es", kvm_segment), ("fs", kvm_segment),
                ("gs", kvm_segment), ("ss", kvm_segment), ("tr", kvm_segment), ("ldt", kvm_segment),
                ("gdt", kvm_dtable), ("idt", kvm_dtable),
                ("cr0", ctypes.c_uint64), ("cr2", ctypes.c_uint64), ("cr3", ctypes.c_uint64),
                ("cr4", ctypes.c_uint64), ("cr8", ctypes.c_uint64), ("efer", ctypes.c_uint64),
                ("apic_base", ctypes.c_uint64), ("interrupt_bitmap", ctypes.c_uint64 * 4)]


class kvm_run_io(ctypes.Structure):      # the `io` member of the kvm_run exit union
    _fields_ = [("direction", ctypes.c_uint8), ("size", ctypes.c_uint8), ("port", ctypes.c_uint16),
                ("count", ctypes.c_uint32), ("data_offset", ctypes.c_uint64)]


class kvm_run_head(ctypes.Structure):    # fixed header of struct kvm_run
    _fields_ = [("request_interrupt_window", ctypes.c_uint8), ("immediate_exit", ctypes.c_uint8),
                ("padding1", ctypes.c_uint8 * 6), ("exit_reason", ctypes.c_uint32),
                ("ready_for_interrupt_injection", ctypes.c_uint8), ("if_flag", ctypes.c_uint8),
                ("flags", ctypes.c_uint16), ("cr8", ctypes.c_uint64), ("apic_base", ctypes.c_uint64),
                ("io", kvm_run_io)]      # union starts at offset 32


assert ctypes.sizeof(kvm_sregs) == 312 and ctypes.sizeof(kvm_regs) == 144

KVM_GET_API_VERSION = _IO(0x00)
KVM_CREATE_VM = _IO(0x01)
KVM_GET_VCPU_MMAP_SIZE = _IO(0x04)
KVM_CREATE_VCPU = _IO(0x41)
KVM_SET_USER_MEMORY_REGION = _IOC(_IOC_WRITE, 0x46, ctypes.sizeof(kvm_userspace_memory_region))
KVM_RUN = _IO(0x80)
KVM_GET_REGS = _IOC(_IOC_READ, 0x81, ctypes.sizeof(kvm_regs))
KVM_SET_REGS = _IOC(_IOC_WRITE, 0x82, ctypes.sizeof(kvm_regs))
KVM_GET_SREGS = _IOC(_IOC_READ, 0x83, ctypes.sizeof(kvm_sregs))
KVM_SET_SREGS = _IOC(_IOC_WRITE, 0x84, ctypes.sizeof(kvm_sregs))

EXIT_NAMES = {2: "KVM_EXIT_IO", 5: "KVM_EXIT_HLT", 6: "KVM_EXIT_MMIO", 8: "KVM_EXIT_SHUTDOWN",
              9: "KVM_EXIT_FAIL_ENTRY", 17: "KVM_EXIT_INTERNAL_ERROR"}

# ---------------------------------------------------------------- guest program
GUEST_ADDR = 0x1000
SERIAL_PORT = 0x3F8


def guest_code(message: bytes = b"Hello from a KVM guest!\n") -> bytes:
    """16-bit real-mode code: print a NUL-terminated string to port 0x3F8, then HLT.

        0x00  BE lo hi    mov  si, msg
        0x03  BA F8 03    mov  dx, 0x3F8
        0x06  AC          lodsb                ; al = [ds:si++]
        0x07  84 C0       test al, al
        0x09  74 03       jz   done            ; -> 0x0E
        0x0B  EE          out  dx, al          ; <-- causes a VM EXIT
        0x0C  EB F8       jmp  0x06
        0x0E  F4          done: hlt            ; <-- causes a VM EXIT
        0x0F  msg db ..., 0
    """
    msg_addr = GUEST_ADDR + 0x0F
    code = bytes([0xBE, msg_addr & 0xFF, msg_addr >> 8,
                  0xBA, 0xF8, 0x03,
                  0xAC,
                  0x84, 0xC0,
                  0x74, 0x03,
                  0xEE,
                  0xEB, 0xF8,
                  0xF4])
    assert len(code) == 0x0F
    return code + message + b"\x00"


def run(message: str = "Hello from a KVM guest!\n", verbose: bool = True) -> dict:
    """Create a VM, run the guest, act as its VMM. Returns exit statistics."""
    if not os.path.exists("/dev/kvm"):
        raise RuntimeError("/dev/kvm not found: no hardware virtualization available "
                           "(enable VT-x/AMD-V in BIOS, load kvm_intel/kvm_amd, or use a host with nested virt).")
    kvm = os.open("/dev/kvm", os.O_RDWR | os.O_CLOEXEC)
    try:
        api = fcntl.ioctl(kvm, KVM_GET_API_VERSION)
        if api != 12:
            raise RuntimeError(f"Unexpected KVM API version {api}")
        vm = fcntl.ioctl(kvm, KVM_CREATE_VM, 0)

        # --- guest "physical" memory: an anonymous mapping in OUR address space
        mem_size = 0x10000
        mem = mmap.mmap(-1, mem_size, mmap.MAP_SHARED | mmap.MAP_ANONYMOUS,
                        mmap.PROT_READ | mmap.PROT_WRITE)
        mem_addr = ctypes.addressof(ctypes.c_char.from_buffer(mem))
        code = guest_code(message.encode())
        mem[GUEST_ADDR:GUEST_ADDR + len(code)] = code
        region = kvm_userspace_memory_region(slot=0, flags=0, guest_phys_addr=0,
                                             memory_size=mem_size, userspace_addr=mem_addr)
        fcntl.ioctl(vm, KVM_SET_USER_MEMORY_REGION, region)

        # --- one virtual CPU and its shared kvm_run page
        vcpu = fcntl.ioctl(vm, KVM_CREATE_VCPU, 0)
        run_size = fcntl.ioctl(kvm, KVM_GET_VCPU_MMAP_SIZE, 0)
        run_map = mmap.mmap(vcpu, run_size, mmap.MAP_SHARED, mmap.PROT_READ | mmap.PROT_WRITE)
        run_head = kvm_run_head.from_buffer(run_map)

        # --- real mode, CS base 0, IP = GUEST_ADDR
        sregs = kvm_sregs()
        fcntl.ioctl(vcpu, KVM_GET_SREGS, sregs)
        sregs.cs.base, sregs.cs.selector = 0, 0
        sregs.ds.base, sregs.ds.selector = 0, 0
        fcntl.ioctl(vcpu, KVM_SET_SREGS, sregs)
        regs = kvm_regs(rip=GUEST_ADDR, rflags=0x2)        # bit 1 of RFLAGS is reserved-1
        fcntl.ioctl(vcpu, KVM_SET_REGS, regs)

        # --- the VMM main loop: run guest until it exits, handle exit, repeat
        stats: dict = {}
        out = bytearray()
        t0 = time.perf_counter()
        while True:
            fcntl.ioctl(vcpu, KVM_RUN, 0)                 # -> VM entry (VMLAUNCH/VMRESUME)
            reason = run_head.exit_reason                 # <- VM exit
            name = EXIT_NAMES.get(reason, f"EXIT_{reason}")
            stats[name] = stats.get(name, 0) + 1
            if reason == 2 and run_head.io.direction == 1 and run_head.io.port == SERIAL_PORT:
                off = run_head.io.data_offset
                byte = run_map[off:off + run_head.io.size]
                out += byte                               # emulate a UART: "print" it
                if verbose:
                    print(byte.decode(errors="replace"), end="", flush=True)
            elif reason == 5:                             # HLT -> guest is done
                break
            else:
                raise RuntimeError(f"Unhandled exit {name}")
        elapsed = time.perf_counter() - t0
        fcntl.ioctl(vcpu, KVM_GET_REGS, regs)
        del run_head
        run_map.close()
        os.close(vcpu)
        os.close(vm)
        return {"output": out.decode(errors="replace"), "exits": stats,
                "final_rip": hex(regs.rip), "elapsed_us": round(elapsed * 1e6, 1)}
    finally:
        os.close(kvm)


def dry_run(message: str = "Hello from a KVM guest!\n") -> dict:
    """
    What `run()` would report, derived WITHOUT hardware (for machines lacking
    /dev/kvm, e.g. Windows/macOS laptops). Clearly labelled as simulated:
    one KVM_EXIT_IO per OUT (= per character) and one KVM_EXIT_HLT.
    """
    return {"output": message, "exits": {"KVM_EXIT_IO": len(message.encode()), "KVM_EXIT_HLT": 1},
            "final_rip": hex(GUEST_ADDR + 0x0F), "elapsed_us": None, "simulated": True}
