"""Render the demo results as a column-width (3.5 in) figure for the IEEE report.

    python report/src/make_demo_figure.py   ->  assets/figures/cpu_techniques_column.png
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, "demo"))

import matplotlib  # noqa: E402
matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

from vdemo import cpu_virt  # noqa: E402
from vdemo.isa import guest_kernel  # noqa: E402

plt.rcParams.update({"font.family": "serif", "font.serif": ["Liberation Serif", "Times New Roman"], "font.size": 7})
res = cpu_virt.compare(guest_kernel(200))
base = res[0].cycles
labels = ["Native", "Trap-and-emulate", "Full virt. (BT)", "Para-virt.", "VT-x (no EPT)", "VT-x + EPT"]
colors = ["#4A5560", "#C8553D", "#3D4F8C", "#0F7C80", "#E59A2B", "#B8741A"]
fig, ax = plt.subplots(figsize=(3.45, 1.9), dpi=300)
vals = [r.cycles / base for r in res]
bars = ax.barh(labels[::-1], vals[::-1], color=colors[::-1], height=0.65)
for b, r in zip(bars, res[::-1]):
    ax.text(b.get_width() + 0.25, b.get_y() + b.get_height() / 2,
            f"{b.get_width():.1f}x" + ("  (incorrect)" if not r.correct else ""), va="center", fontsize=6.5)
ax.set_xlabel("Execution time relative to native (lower is better)")
ax.set_xlim(0, max(vals) * 1.32)
ax.spines[["top", "right"]].set_visible(False)
fig.tight_layout(pad=0.3)
out = os.path.join(ROOT, "assets", "figures", "cpu_techniques_column.png")
fig.savefig(out)
print("wrote", out)
