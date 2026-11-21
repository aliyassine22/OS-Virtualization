# vdemo: virtualization, live

An educational demo that makes the mechanisms in the report observable. It has two parts:

1. **A simulator** (Python standard library only). It runs the *same* synthetic guest kernel under native execution, naive trap-and-emulate, binary translation, para-virtualization, and VT-x with and without EPT. It checks equivalence against native execution and counts traps, VM exits and hypercalls by cause.
2. **A real hypervisor in about 150 lines of Python** (`kvm_hello.py`). It drives Linux's `/dev/kvm` directly with `ioctl()`: it creates a VM, loads 15 bytes of 16-bit code, and handles each VM exit.

```bash
cd demo
python -m vdemo tour          # guided live demo (Enter between steps)
python -m vdemo all --plot    # everything without pauses, saves charts to demo/output/
python -m unittest discover -s tests -t .   # 9 tests
```

## Steps

| Command | Shows | Report |
|---|---|---|
| `check` | CPU flags `vmx`/`svm`, `ept`/`npt`, `vpid`, `hypervisor`; `/dev/kvm` | II-B, III-C |
| `popf` | POPF/SGDT are sensitive but unprivileged, so the naive VMM **silently** breaks equivalence | II-C, II-D |
| `cpu` | Cycles, slowdown, % of instructions run directly, correctness, and exit/trap breakdown for each technique | III |
| `memory` | 2-D page walk = (n+1)(m+1)−1 = 24 references; shadow vs nested paging on three workloads | IV |
| `migrate` | Pre-copy rounds, downtime vs stop-and-copy; try `--dirty 40000` to see non-convergence | V |
| `kvm` | A real VM: `KVM_EXIT_IO` per character + `KVM_EXIT_HLT` (simulated fallback if no KVM) | III-C |

Useful options: `--vmexit 300` (modern exit cost), `--vmexit 3000` (early VT-x), `--trap`, `--hypercall`, `--iterations`, `--mem`, `--bw`, `--dirty`, `--message "text"`.

## Code map

```
vdemo/
├── isa.py             toy x86-like ISA: privileged / sensitive sets, guest kernel, PV "port"
├── cpu_virt.py        5 execution engines + cost model + equivalence check
├── memory_virt.py     2-D walk enumeration, shadow vs nested cost model
├── live_migration.py  pre-copy and stop-and-copy models (Clark et al. 2005)
├── kvm_hello.py       real KVM API via ctypes/ioctl (Linux, VT-x/AMD-V)
├── host_check.py      reads /proc/cpuinfo, /dev/kvm, systemd-detect-virt
└── __main__.py        CLI and guided tour
```

## Honest caveats

- **The cycle costs are illustrative**, order-of-magnitude values; edit them in `COSTS` in `cpu_virt.py`. The guest kernel is deliberately kernel-heavy, so the absolute slowdowns are exaggerated. Real CPU-bound applications run within a few percent of native. What the demo reproduces faithfully is the *qualitative* picture from the literature [Adams & Agesen 2006; Bhargava et al. 2008; Clark et al. 2005].
- The **KVM demo needs** Linux, VT-x/AMD-V enabled in the firmware, and read/write access to `/dev/kvm` (`sudo usermod -aG kvm $USER`). On Windows or macOS, or in a VM without nested virtualization, it prints a clearly labelled *simulated* result. Run it beforehand on a Linux machine with KVM and keep a screenshot as a backup.
- The 16-bit guest code was verified by disassembly (`objdump -mi8086`). The KVM run itself could not be executed in the build environment (no `/dev/kvm`), so test it once on your presentation machine.
