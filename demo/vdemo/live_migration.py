"""
Live migration of a running VM: iterative *pre-copy* (Clark et al., NSDI 2005)
vs. naive *stop-and-copy*.

Pre-copy:
  round 0  copy ALL memory while the VM keeps running
  round k  re-send only pages dirtied during round k-1
  stop     when the dirty set is small (or stops shrinking): pause the VM,
           copy the remaining pages + CPU/device state, resume on the target.

Downtime = time of the final stop-and-copy only, typically tens to hundreds of ms,
versus seconds for copying the whole VM while paused.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List

PAGE = 4096


@dataclass
class MigrationResult:
    rounds: List[dict] = field(default_factory=list)
    total_time_s: float = 0.0
    downtime_ms: float = 0.0
    data_sent_mb: float = 0.0
    converged: bool = True


def precopy(mem_mb: int = 4096, bw_mbps: float = 1000.0, dirty_pages_per_s: float = 15_000,
            wws_mb: int = 256, stop_threshold_pages: int = 2_000, max_rounds: int = 30,
            device_state_ms: float = 15.0) -> MigrationResult:
    """
    mem_mb             VM memory size
    bw_mbps            migration link bandwidth (megabits/s)
    dirty_pages_per_s  rate at which the guest writes to (distinct) pages
    wws_mb             writable working set: the hot pages the guest keeps dirtying
    """
    bytes_per_s = bw_mbps * 1e6 / 8
    total_pages = mem_mb * 1024 * 1024 // PAGE
    wws_pages = wws_mb * 1024 * 1024 // PAGE
    res = MigrationResult()
    to_send = total_pages
    t = 0.0
    sent = 0
    for rnd in range(max_rounds):
        dur = to_send * PAGE / bytes_per_s
        dirtied = int(min(wws_pages, dirty_pages_per_s * dur))
        res.rounds.append({"round": rnd, "pages_sent": to_send, "duration_s": dur, "dirtied": dirtied})
        t += dur
        sent += to_send
        if dirtied <= stop_threshold_pages:
            to_send = dirtied
            break
        if dirtied >= to_send:                  # not converging: dirty rate >= bandwidth
            res.converged = False
            to_send = dirtied
            break
        to_send = dirtied
    stop_copy = to_send * PAGE / bytes_per_s
    res.downtime_ms = stop_copy * 1000 + device_state_ms
    res.total_time_s = t + stop_copy
    res.data_sent_mb = (sent + to_send) * PAGE / 2**20
    return res


def stop_and_copy(mem_mb: int = 4096, bw_mbps: float = 1000.0, device_state_ms: float = 15.0) -> float:
    """Downtime (ms) when the VM is paused for the entire copy."""
    return mem_mb * 2**20 / (bw_mbps * 1e6 / 8) * 1000 + device_state_ms
