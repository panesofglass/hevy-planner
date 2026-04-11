# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: benchmarks.spec.ts >> Phase advancement >> POST /api/advance-phase/:id without gates passed returns 400
- Location: tests/e2e/benchmarks.spec.ts:186:7

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected substring: "Gates not passed"
Received string:    "Phase is not current"
```

# Test source

```ts
  93  |   test("gate test status appears on roadmap", async ({ page }) => {
  94  |     await page.goto("/progress");
  95  |     await page.waitForLoadState("networkidle");
  96  |     await expect(page.locator("#content")).toContainText(/gate/i);
  97  |   });
  98  | 
  99  |   test("retest frequency shows timing info", async ({ page }) => {
  100 |     // Log a benchmark first so timing info appears
  101 |     await page.request.post(
  102 |       `${BASE_URL}/api/log-benchmark/wall-dorsiflexion`,
  103 |       {
  104 |         headers: { "Content-Type": "application/x-www-form-urlencoded" },
  105 |         data: "value=3.5&passed=true",
  106 |       }
  107 |     );
  108 | 
  109 |     await page.goto("/progress");
  110 |     await page.waitForLoadState("networkidle");
  111 |     await expect(page.locator("#content")).toContainText(/last tested|retest|due/i);
  112 |   });
  113 | 
  114 |   test("wrong-phase benchmarks do not satisfy Phase 1 gates", async ({ page }) => {
  115 |     // Log benchmarks that are NOT Phase 1 gates
  116 |     const wrongGates = [
  117 |       "strict-pullups-12", "parallel-dips-15", "false-grip-20s",
  118 |       "ring-support-30s", "pistol-to-box", "wall-handstand-45s",
  119 |     ];
  120 |     for (const gate of wrongGates) {
  121 |       await page.request.post(
  122 |         `${BASE_URL}/api/log-benchmark/${gate}`,
  123 |         {
  124 |           headers: { "Content-Type": "application/x-www-form-urlencoded" },
  125 |           data: "value=pass&passed=true",
  126 |         }
  127 |       );
  128 |     }
  129 | 
  130 |     // Phase 1 should NOT show "all gates passed"
  131 |     await page.goto("/progress");
  132 |     await page.waitForLoadState("networkidle");
  133 |     // This is a negative assertion — wrong benchmarks should not satisfy gates
  134 |     const content = await page.locator("#content").textContent();
  135 |     // If "all gates passed" appears, wrong benchmarks satisfied the gates (bug)
  136 |     expect(content?.toLowerCase()).not.toContain("all gates passed");
  137 |   });
  138 | 
  139 |   test("bilateral tracking — log both sides, verify both on /progress", async ({ page }) => {
  140 |     // Log left side
  141 |     await page.request.post(
  142 |       `${BASE_URL}/api/log-benchmark/wall-dorsiflexion`,
  143 |       {
  144 |         headers: { "Content-Type": "application/x-www-form-urlencoded" },
  145 |         data: "value=4.5&passed=true&side=left&notes=Left+side",
  146 |       }
  147 |     );
  148 | 
  149 |     // Log right side
  150 |     await page.request.post(
  151 |       `${BASE_URL}/api/log-benchmark/wall-dorsiflexion`,
  152 |       {
  153 |         headers: { "Content-Type": "application/x-www-form-urlencoded" },
  154 |         data: "value=2.5&passed=false&side=right&notes=Right+Achilles+side",
  155 |       }
  156 |     );
  157 | 
  158 |     await page.goto("/progress");
  159 |     await page.waitForLoadState("networkidle");
  160 | 
  161 |     const content = page.locator("#content");
  162 |     await expect(content).toContainText(/left/i);
  163 |     await expect(content).toContainText(/right/i);
  164 |   });
  165 | });
  166 | 
  167 | test.describe("Phase advancement", () => {
  168 |   test.beforeAll(async ({ browser }) => {
  169 |     const page = await browser.newPage();
  170 |     try {
  171 |       await seedDatabase(page);
  172 |     } catch {
  173 |       // Seed may fail if user already exists
  174 |     } finally {
  175 |       await page.close();
  176 |     }
  177 |   });
  178 | 
  179 |   test("POST /api/advance-phase/nonexistent-xyz returns 404", async ({ page }) => {
  180 |     const response = await page.request.post(
  181 |       `${BASE_URL}/api/advance-phase/nonexistent-phase-xyz`
  182 |     );
  183 |     expect(response.status()).toBe(404);
  184 |   });
  185 | 
  186 |   test("POST /api/advance-phase/:id without gates passed returns 400", async ({ page }) => {
  187 |     // Phase 2 gates are not passed — should fail
  188 |     const response = await page.request.post(
  189 |       `${BASE_URL}/api/advance-phase/phase2`
  190 |     );
  191 |     expect(response.status()).toBe(400);
  192 |     const body = await response.text();
> 193 |     expect(body).toContain("Gates not passed");
      |                  ^ Error: expect(received).toContain(expected) // indexOf
  194 |   });
  195 | 
  196 |   test("ready-to-advance prompt appears when all gates passed", async ({ page }) => {
  197 |     // Log all Phase 1 gate benchmarks
  198 |     for (const gateId of PHASE1_GATE_IDS) {
  199 |       await page.request.post(
  200 |         `${BASE_URL}/api/log-benchmark/${gateId}`,
  201 |         {
  202 |           headers: { "Content-Type": "application/x-www-form-urlencoded" },
  203 |           data: "value=pass&passed=true",
  204 |         }
  205 |       );
  206 |     }
  207 | 
  208 |     await page.goto("/progress");
  209 |     await page.waitForLoadState("networkidle");
  210 |     await expect(page.locator("#content")).toContainText(/ready to advance/i);
  211 |   });
  212 | 
  213 |   test("after logging all Phase 1 gate benchmarks, advance-phase returns 202", async ({ page }) => {
  214 |     // Log all 8 Phase 1 gate benchmarks as passed
  215 |     for (const gateId of PHASE1_GATE_IDS) {
  216 |       const resp = await page.request.post(
  217 |         `${BASE_URL}/api/log-benchmark/${gateId}`,
  218 |         {
  219 |           headers: { "Content-Type": "application/x-www-form-urlencoded" },
  220 |           data: "value=pass&passed=true",
  221 |         }
  222 |       );
  223 |       expect(resp.status()).toBe(202);
  224 |     }
  225 | 
  226 |     // Now advance Phase 1
  227 |     const response = await page.request.post(
  228 |       `${BASE_URL}/api/advance-phase/phase1`
  229 |     );
  230 |     expect(response.status()).toBe(202);
  231 |   });
  232 | 
  233 |   test("phase change persists on /progress page reload", async ({ page }) => {
  234 |     // Ensure Phase 1 gates are passed and phase is advanced (idempotent setup)
  235 |     for (const gateId of PHASE1_GATE_IDS) {
  236 |       await page.request.post(
  237 |         `${BASE_URL}/api/log-benchmark/${gateId}`,
  238 |         {
  239 |           headers: { "Content-Type": "application/x-www-form-urlencoded" },
  240 |           data: "value=pass&passed=true",
  241 |         }
  242 |       );
  243 |     }
  244 |     // Advance may fail if already advanced — that's fine
  245 |     await page.request.post(`${BASE_URL}/api/advance-phase/phase1`);
  246 | 
  247 |     // Reload progress page
  248 |     await page.goto("/progress");
  249 |     await page.waitForLoadState("networkidle");
  250 | 
  251 |     const content = page.locator("#content");
  252 |     // Phase 1 should show completed status
  253 |     await expect(content).toContainText(/completed/i);
  254 |   });
  255 | 
  256 |   test("cannot re-advance already completed phase (400)", async ({ page }) => {
  257 |     // Ensure Phase 1 is already advanced (from prior test or setup)
  258 |     for (const gateId of PHASE1_GATE_IDS) {
  259 |       await page.request.post(
  260 |         `${BASE_URL}/api/log-benchmark/${gateId}`,
  261 |         {
  262 |           headers: { "Content-Type": "application/x-www-form-urlencoded" },
  263 |           data: "value=pass&passed=true",
  264 |         }
  265 |       );
  266 |     }
  267 |     await page.request.post(`${BASE_URL}/api/advance-phase/phase1`);
  268 | 
  269 |     // Try to re-advance Phase 1 — should fail
  270 |     const response = await page.request.post(
  271 |       `${BASE_URL}/api/advance-phase/phase1`
  272 |     );
  273 |     expect(response.status()).toBe(400);
  274 |     const body = await response.text();
  275 |     expect(body).toContain("already completed");
  276 |   });
  277 | });
  278 | 
```