"""
Command-line entry point.

    python -m vdemo tour            guided live demo (press Enter between steps)
    python -m vdemo check           1. is this machine able to virtualize?
    python -m vdemo popf            2. why naive trap-and-emulate fails on x86
    python -m vdemo cpu             3. full vs para vs hardware-assisted
    python -m vdemo memory          4. shadow page tables vs EPT/NPT
    python -m vdemo migrate         5. live migration (pre-copy)
    python -m vdemo kvm             6. a REAL VM via /dev/kvm (Linux)

Add --plot to save charts to demo/output/ (needs matplotlib).
"""
from __future__ import annotations

import argparse
import os
import sys

from . import cpu_virt, host_check, kvm_hello, live_migration, memory_virt
from .isa import guest_kernel

# ----------------------------------------------------------------- styling
_COLOR = sys.stdout.isatty() and not os.environ.get("NO_COLOR")


def _c(code: str, s: str) -> str:
    return f"\033[{code}m{s}\033[0m" if _COLOR else s


B = lambda s: _c("1", s)          # noqa: E731
G = lambda s: _c("32", s)         # noqa: E731
R = lambda s: _c("31", s)         # noqa: E731
Y = lambda s: _c("33", s)         # noqa: E731
C = lambda s: _c("36", s)         # noqa: E731
DIM = lambda s: _c("2", s)        # noqa: E731

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "output")


def header(n: str, title: str, idea: str) -> None:
    print("\n" + B(C(f"== {n} | {title} ")) + C("=" * max(0, 70 - len(title) - len(n))))
    print(DIM(idea) + "\n")


def bar(value: float, vmax: float, width: int = 34) -> str:
    n = max(1, int(round(width * value / vmax))) if vmax else 0
    return "#" * n


# ----------------------------------------------------------------- 1. check
def cmd_check(_args) -> None:
    header("1", "Host capabilities", "Hardware-assisted virtualization needs CPU support (VT-x / AMD-V).")
    rep = host_check.report()
    print(f"  OS: {rep['os']}")
    if not rep["linux"]:
        print(Y("  Not Linux: CPU flags unavailable. On Windows run `systeminfo` (Hyper-V requirements);"
                " on macOS `sysctl kern.hv_support`."))
    for flag, desc in host_check.FLAG_INFO.items():
        mark = G("yes") if rep["flags"][flag] else DIM("no ")
        print(f"  [{mark}] {flag:<13} {desc}")
    print(f"\n  /dev/kvm present: {G('yes') if rep['dev_kvm'] else R('no')}"
          f"   accessible: {G('yes') if rep['dev_kvm_rw'] else R('no')}"
          f"   modules: {', '.join(rep['kvm_modules']) or '-'}")
    if rep["virt_detect"]:
        print(f"  Virtualization layer detected: {Y(rep['virt_detect'])}")


# ----------------------------------------------------------------- 2. popf
def cmd_popf(args) -> None:
    header("2", "The x86 problem: sensitive but unprivileged",
           "Popek & Goldberg (1974): trap-and-emulate works iff sensitive instructions are a subset of "
           "privileged ones.\nOn classic x86, POPF and SGDT (among 17 such instructions) do NOT trap in ring 1.")
    prog = guest_kernel(args.iterations)
    native = cpu_virt.NativeCPU().run(prog)
    naive = cpu_virt.TrapAndEmulateVMM().run(prog)
    for res in (naive,):
        ref = native.state
        print(f"  {'state field':<16}{'native':>22}{'trap-and-emulate VM':>26}")
        for k in ("GDTR_seen", "work_with_IF=0", "IF", "CR3"):
            a, b = ref[k], res.state[k]
            fmt = (lambda x: hex(x) if isinstance(x, int) and x > 0xFFF else str(x))
            flag = G("  ok") if a == b else R("  MISMATCH")
            print(f"  {k:<16}{fmt(a):>22}{fmt(b):>26}{flag}")
    silent = {k: v for k, v in naive.events.items() if k.startswith("SILENT")}
    traps = sum(v for k, v in naive.events.items() if k.startswith("trap"))
    print(f"\n  Traps the VMM saw: {traps}.  Instructions that slipped past it: {R(str(silent))}")
    print("  -> The guest saw the HOST's GDT base and its critical sections ran with interrupts ENABLED.")
    print("     Equivalence is violated; the VMM never even knew. " + B("Hence BT, para-virt, and VT-x/AMD-V."))


# ----------------------------------------------------------------- 3. cpu
def cmd_cpu(args) -> None:
    header("3", "Full vs. para vs. hardware-assisted",
           "Same guest kernel, five execution engines. Cycles are simulated with an illustrative cost model\n"
           f"(VM exit = {cpu_virt.COSTS['vmexit']} cycles, trap = {cpu_virt.COSTS['trap']}, "
           f"hypercall = {cpu_virt.COSTS['hypercall']}). Change with --vmexit / --trap / --hypercall.")
    prog = guest_kernel(args.iterations)
    results = cpu_virt.compare(prog)
    base = results[0].cycles
    vmax = max(r.cycles for r in results)
    print(f"  {'technique':<34}{'cycles':>9}{'slowdown':>10}{'direct':>8}  correct")
    for r in results:
        ok = G("yes") if r.correct else R("NO ")
        print(f"  {r.name:<34}{r.cycles:>9}{r.cycles / base:>9.2f}x{r.direct_ratio:>8.1%}  {ok}  "
              f"{DIM(bar(r.cycles, vmax))}")
    print()
    for r in results[2:]:
        top = ", ".join(f"{k}={v}" for k, v in r.events.most_common(4))
        print(f"  {B(r.name)}\n     {DIM(top)}")
        for n in r.notes:
            print(f"     {DIM(n)}")
    print(f"\n  {B('Take-aways')}: BT is correct but pays for translation and shadow paging; para-virt is fastest\n"
          "  but needs a modified guest; VT-x runs UNMODIFIED guests, and EPT removes most of its VM exits.")
    if args.plot:
        _plot_cpu(results)


def _plot_cpu(results) -> None:
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError:
        print(Y("  (matplotlib not installed: pip install matplotlib)"))
        return
    os.makedirs(OUT_DIR, exist_ok=True)
    base = results[0].cycles
    names = [r.name.replace(" (", "\n(") for r in results]
    vals = [r.cycles / base for r in results]
    colors = ["#5b6770", "#c0392b", "#2e86ab", "#1b998b", "#f4a259", "#e07a1f"]
    fig, ax = plt.subplots(figsize=(7.2, 3.4), dpi=200)
    bars = ax.barh(names[::-1], vals[::-1], color=colors[::-1])
    for b_, r in zip(bars, results[::-1]):
        lbl = f"{b_.get_width():.1f}x" + ("" if r.correct else "  (incorrect!)")
        ax.text(b_.get_width() + 0.2, b_.get_y() + b_.get_height() / 2, lbl, va="center", fontsize=8)
    ax.set_xlabel("Simulated execution time relative to native (lower is better)")
    ax.spines[["top", "right"]].set_visible(False)
    ax.tick_params(labelsize=8)
    fig.tight_layout()
    path = os.path.join(OUT_DIR, "cpu_techniques.png")
    fig.savefig(path)
    print(G(f"  chart saved -> {path}"))


# ----------------------------------------------------------------- 4. memory
def cmd_memory(args) -> None:
    header("4", "Memory: shadow page tables vs. nested paging (EPT/NPT)",
           "GVA -> GPA -> HPA. Shadow paging: cheap TLB miss, expensive intercepts.\n"
           "Nested paging: no intercepts, but a 2-D page walk on every TLB miss.")
    refs = memory_virt.two_d_walk()
    print(f"  Native 4-level walk : {B('4')} memory references")
    print(f"  Nested 4x4 walk     : {B(str(len(refs)))} references = (4+1)(4+1)-1")
    print(f"  Nested, 2 MiB host pages (4x3): {memory_virt.walk_refs(4, 3)} references\n")
    print(DIM("  first 10 steps of the 2-D walk: " + ", ".join(f"{a}:{b}" for a, b in refs[:10]) + ", ...\n"))
    print(f"  {'workload':<32}{'shadow':>10}{'nested':>10}{'nested+2M':>11}   winner")
    for name, n, sh, ne, ne2 in memory_virt.compare_workloads():
        win = "nested" if ne < sh else "shadow"
        print(f"  {name:<32}{sh / n:>9.2f}x{ne / n:>9.2f}x{ne2 / n:>10.2f}x   {G(win)}")
    print(DIM("\n  (values = overhead relative to native paging)"))
    print(f"  {B('Take-away')}: nested paging wins whenever the guest edits page tables / switches processes often;\n"
          "  large pages and page-walk caches recover most of the 2-D walk cost.")


# ----------------------------------------------------------------- 5. migrate
def cmd_migrate(args) -> None:
    header("5", "Live migration (iterative pre-copy)",
           "Clark et al., NSDI 2005: copy memory while the VM runs, re-send dirtied pages, then a short pause.")
    res = live_migration.precopy(mem_mb=args.mem, bw_mbps=args.bw, dirty_pages_per_s=args.dirty)
    print(f"  VM RAM {args.mem} MiB, link {args.bw:.0f} Mbit/s, guest dirties {args.dirty:,} pages/s\n")
    print(f"  {'round':>5}{'pages sent':>12}{'time (s)':>10}{'dirtied meanwhile':>19}")
    for r in res.rounds:
        print(f"  {r['round']:>5}{r['pages_sent']:>12,}{r['duration_s']:>10.2f}{r['dirtied']:>19,}")
    sc = live_migration.stop_and_copy(args.mem, args.bw)
    print(f"\n  pre-copy : total {res.total_time_s:6.1f} s, data {res.data_sent_mb:,.0f} MiB, "
          f"downtime {G(f'{res.downtime_ms:,.0f} ms')}" + ("" if res.converged else R("  (did not converge!)")))
    print(f"  stop&copy: downtime {R(f'{sc:,.0f} ms')}  ({sc / max(res.downtime_ms, 1):.0f}x longer)")
    print(f"  {B('Take-away')}: users see a pause of ~{res.downtime_ms:,.0f} ms; this is what makes "
          "maintenance and disaster recovery without downtime possible.")


# ----------------------------------------------------------------- 6. kvm
def cmd_kvm(args) -> None:
    header("6", "A real VM in ~150 lines of Python (/dev/kvm)",
           "We become the VMM: create a VM, load 15 bytes of 16-bit code, KVM_RUN, handle each VM exit.")
    try:
        print("  guest output > ", end="")
        res = kvm_hello.run(args.message + "\n")
    except (RuntimeError, OSError) as exc:
        print(R("\n  " + str(exc)))
        print(Y("  Showing the expected result instead (SIMULATED, no hardware used):"))
        res = kvm_hello.dry_run(args.message + "\n")
        print("  guest output > " + res["output"], end="")
    print(f"\n  VM exits handled by our Python VMM: {B(str(res['exits']))}")
    if res.get("elapsed_us"):
        print(f"  wall time: {res['elapsed_us']} us   final RIP: {res['final_rip']}")
    print(DIM("  Each OUT = one exit (reason IO_INSTRUCTION -> KVM_EXIT_IO); HLT = one exit; everything else "
              "ran natively on the CPU in VMX non-root mode."))


# ----------------------------------------------------------------- tour
STEPS = [("check", cmd_check), ("popf", cmd_popf), ("cpu", cmd_cpu),
         ("memory", cmd_memory), ("migrate", cmd_migrate), ("kvm", cmd_kvm)]


def cmd_tour(args) -> None:
    print(B("\nVirtualization in Operating Systems - live demo"))
    for i, (_, fn) in enumerate(STEPS):
        fn(args)
        if i < len(STEPS) - 1 and not args.no_pause:
            input(DIM("\n  [Enter] next step ..."))


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="python -m vdemo", description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("command", nargs="?", default="tour",
                   choices=["tour", "all"] + [s for s, _ in STEPS])
    p.add_argument("--iterations", type=int, default=200, help="guest kernel loop iterations")
    p.add_argument("--vmexit", type=int, help="override VM exit cost (cycles)")
    p.add_argument("--trap", type=int, help="override trap cost (cycles)")
    p.add_argument("--hypercall", type=int, help="override hypercall cost (cycles)")
    p.add_argument("--mem", type=int, default=4096, help="VM memory for migration (MiB)")
    p.add_argument("--bw", type=float, default=1000.0, help="migration bandwidth (Mbit/s)")
    p.add_argument("--dirty", type=float, default=15_000, help="guest dirty rate (pages/s)")
    p.add_argument("--message", default="Hello from a KVM guest!", help="text the KVM guest prints")
    p.add_argument("--plot", action="store_true", help="save charts to demo/output/")
    p.add_argument("--no-pause", action="store_true", help="tour without waiting for Enter")
    return p


def main(argv=None) -> None:
    args = build_parser().parse_args(argv)
    for key in ("vmexit", "trap", "hypercall"):
        if getattr(args, key):
            cpu_virt.COSTS[key] = getattr(args, key)
    if args.command == "all":
        args.no_pause = True
        args.command = "tour"
    {"tour": cmd_tour, **dict(STEPS)}[args.command](args)


if __name__ == "__main__":
    main()
