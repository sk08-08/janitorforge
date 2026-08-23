import { filterContent } from "../features/moderation/lib/content-filter";

type TestCase = {
  text: string;
  expect: "safe" | "warning" | "dangerous";
};

const cases: TestCase[] = [
  { text: "kys", expect: "dangerous" },
  { text: "kill yourself", expect: "dangerous" },
  { text: "I want to die", expect: "dangerous" },
  { text: "You are garbage", expect: "warning" },
  { text: "This is a bop song", expect: "safe" },
  { text: "Go die", expect: "warning" },
  { text: "I'm going to kill you", expect: "dangerous" },
  { text: "I will rape you", expect: "dangerous" },
  { text: "deep cuts on my arm", expect: "dangerous" },
];

let failed = 0;

for (const c of cases) {
  const res = filterContent(c.text);
  const pass = res.riskLevel === c.expect;
  console.log(
    `Test: "${c.text}" => expected=${c.expect}, got=${res.riskLevel} ${pass ? "OK" : "FAIL"}`,
  );
  if (!pass) {
    console.log("  flags:", res.flags, "reason:", res.reason);
    failed++;
  }
}

if (failed > 0) {
  console.error(`${failed} test(s) failed`);
  process.exit(1);
}

console.log("All tests passed");
process.exit(0);
