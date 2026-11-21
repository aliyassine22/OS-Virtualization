"""Sanity tests: run with `python -m pytest demo/tests` (or `python -m unittest` from demo/)."""
import unittest

from vdemo import cpu_virt, kvm_hello, live_migration, memory_virt
from vdemo.isa import HYPERCALL, SENSITIVE, guest_kernel, paravirtualize


class CPUVirtTests(unittest.TestCase):
    def setUp(self):
        self.results = {r.name: r for r in cpu_virt.compare(guest_kernel(100))}

    def test_naive_trap_and_emulate_violates_equivalence(self):
        r = self.results["Trap-and-emulate (naive x86)"]
        self.assertFalse(r.correct)
        self.assertTrue(any("GDTR_seen" in d for d in r.diffs))

    def test_bt_pv_hw_are_equivalent_to_native(self):
        for name, r in self.results.items():
            if not name.startswith("Trap"):
                self.assertTrue(r.correct, f"{name}: {r.diffs}")

    def test_expected_performance_ordering(self):
        c = {n: r.cycles for n, r in self.results.items()}
        self.assertLess(c["Para-virtualization (hypercalls)"], c["Full virt. (binary translation)"])
        self.assertLess(c["HW-assisted (VT-x + EPT)"], c["HW-assisted (VT-x, no EPT)"])

    def test_paravirtualized_guest_has_no_sensitive_instructions(self):
        pv = paravirtualize(guest_kernel(50))
        self.assertFalse(any(i.op in SENSITIVE for i in pv))
        self.assertTrue(any(i.op == HYPERCALL for i in pv))


class MemoryTests(unittest.TestCase):
    def test_two_dimensional_walk_is_24_refs(self):
        self.assertEqual(len(memory_virt.two_d_walk(4, 4)), 24)
        self.assertEqual(memory_virt.walk_refs(4, 3), 19)


class MigrationTests(unittest.TestCase):
    def test_precopy_downtime_far_below_stop_and_copy(self):
        res = live_migration.precopy()
        self.assertTrue(res.converged)
        self.assertLess(res.downtime_ms * 50, live_migration.stop_and_copy())

    def test_non_convergence_when_dirty_rate_exceeds_bandwidth(self):
        self.assertFalse(live_migration.precopy(dirty_pages_per_s=40_000).converged)


class KVMTests(unittest.TestCase):
    def test_guest_code_layout(self):
        code = kvm_hello.guest_code(b"hi\n")
        self.assertEqual(code[0x0B], 0xEE)   # OUT
        self.assertEqual(code[0x0E], 0xF4)   # HLT
        self.assertEqual(code[0x0F:], b"hi\n\x00")

    def test_dry_run_counts_one_exit_per_char(self):
        self.assertEqual(kvm_hello.dry_run("abc")["exits"], {"KVM_EXIT_IO": 3, "KVM_EXIT_HLT": 1})


if __name__ == "__main__":
    unittest.main()
