/** Port of demo/vdemo/live_migration.py (iterative pre-copy, Clark et al. 2005). */
const PAGE = 4096;

export function precopy({ memMiB = 4096, bwMbps = 1000, dirtyPerS = 15000, wwsMiB = 256, threshold = 2000, maxRounds = 30, deviceMs = 15 } = {}) {
  const Bps = (bwMbps * 1e6) / 8;
  const total = (memMiB * 1048576) / PAGE;
  const wws = (wwsMiB * 1048576) / PAGE;
  const rounds = [];
  let toSend = total, t = 0, sent = 0, converged = true;
  for (let r = 0; r < maxRounds; r++) {
    const dur = (toSend * PAGE) / Bps;
    const dirtied = Math.floor(Math.min(wws, dirtyPerS * dur));
    rounds.push({ round: r, pages: toSend, dur, dirtied });
    t += dur; sent += toSend;
    if (dirtied <= threshold) { toSend = dirtied; break; }
    if (dirtied >= toSend) { converged = false; toSend = dirtied; break; }
    toSend = dirtied;
  }
  const stop = (toSend * PAGE) / Bps;
  return {
    rounds, converged, finalPages: toSend,
    downtimeMs: stop * 1000 + deviceMs,
    totalS: t + stop,
    sentMiB: ((sent + toSend) * PAGE) / 1048576,
    stopAndCopyMs: ((memMiB * 1048576) / Bps) * 1000 + deviceMs,
  };
}
