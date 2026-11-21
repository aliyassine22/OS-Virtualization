"""Inspect the *real* machine: does it support hardware-assisted virtualization?"""
from __future__ import annotations

import os
import platform
import shutil
import subprocess

FLAG_INFO = {
    "vmx": "Intel VT-x (VMX root/non-root operation)",
    "svm": "AMD-V / SVM (VMRUN, VMCB)",
    "ept": "Intel EPT - nested paging (2nd-gen VT-x)",
    "npt": "AMD NPT/RVI - nested paging",
    "vpid": "Intel VPID - tagged TLB, no flush on VM exit",
    "flexpriority": "Intel virtual APIC TPR acceleration",
    "hypervisor": "We are ourselves running INSIDE a VM (CPUID bit 31 of ECX)",
}


def cpu_flags() -> set:
    try:
        with open("/proc/cpuinfo") as f:
            for line in f:
                if line.startswith("flags"):
                    return set(line.split(":", 1)[1].split())
    except OSError:
        pass
    return set()


def detect_virt() -> str | None:
    if shutil.which("systemd-detect-virt"):
        try:
            out = subprocess.run(["systemd-detect-virt"], capture_output=True, text=True, timeout=3)
            return out.stdout.strip() or None
        except Exception:
            return None
    try:
        with open("/sys/class/dmi/id/product_name") as f:
            return f.read().strip()
    except OSError:
        return None


def report() -> dict:
    flags = cpu_flags()
    return {
        "os": f"{platform.system()} {platform.release()} ({platform.machine()})",
        "flags": {k: (k in flags) for k in FLAG_INFO},
        "dev_kvm": os.path.exists("/dev/kvm"),
        "dev_kvm_rw": os.access("/dev/kvm", os.R_OK | os.W_OK),
        "kvm_modules": sorted(m for m in ("kvm", "kvm_intel", "kvm_amd")
                              if os.path.isdir(f"/sys/module/{m}")),
        "virt_detect": detect_virt(),
        "linux": platform.system() == "Linux",
    }
