# Development environment
Branch: develop. No global Git or Java settings changed.

- Node 24.11.0 / npm 11.6.1.
- Next 16.4.0, React / React DOM 19.3.0; installed successfully from npm.
- Spring Boot 4.1.1, Maven Wrapper 3.9.16, Java release 21.
- Portable Eclipse Temurin 21.0.12.1+1 downloaded to ignored .tools/; SHA-256 verified against Adoptium package metadata. Set JAVA_HOME for each shell to that directory, or use your own JDK 21.
- Boot starter versions use the parent's dependency management instead of explicit 4.1.0 overrides.
- Frontend dependencies pinned in package.json and package-lock.json, including STOMP 7.3.0, SockJS 1.6.1, Vitest 5.0.3, Playwright 1.64.0, Tailwind PostCSS 4.3.3.
- Baseline: 35 original backend tests passed on Java 23 and then Java 21; frontend production build passed after replacing the custom CSS loader with PostCSS.
- Chromium browser installed for Playwright; Edge project uses the locally installed Microsoft Edge.
- npm audit currently reports five development-only advisories through ESLint Next's glob dependency; no production dependency advisories. Do not downgrade Next's ESLint config with audit --force.

Feature documentation is in ../specs/001-game-frontend outside this Git repository. Install/build/test evidence is recorded there in validation.md.

Runtime: production BE 8080, FE 3000. Public FE env names are NEXT_PUBLIC_API_URL and NEXT_PUBLIC_WS_URL (HTTP SockJS endpoint). E2E uses test-classpath fixture BE on loopback 8081, with no fixtures/timing endpoints in the production JAR. Stop an existing Next dev server configured for 8080 before E2E, so Playwright does not reuse the wrong environment. Browser build and browser E2E must run sequentially; both write Next artifacts.

Automated story gates US1–US5, desktop keyboard/layout, full games 5/10 and privacy matrix 5/6/7/10 have passed on Chromium/Edge. Initial 30-change local timing runs passed 30/30 per browser; exact final suite outcomes are in validation.md. Backend suite 61 tests, frontend suite 25 tests. Real five-person T074 remains Pending; no deployment or remote-network latency claim.

Final verification: 64/64 complete Chromium/Edge E2E pass plus 10/10 isolated onboarding/navigation cases (66 distinct browser cases overall); lint/typecheck/build pass, 25 FE and 61 BE tests pass. Final calibrated local max commit-to-render latency: Chromium 33.596 ms, Edge 34.085 ms, 30/30 samples each. Tasks 74/75 complete; T074 real-person session remains Pending. No commit/push/deploy.

Vietnamese font fix: pinned @fontsource-variable/noto-sans and noto-serif 5.3.0, locally bundled with Vietnamese subsets. Browser glyph inspection confirms the heading including Nhiều uses custom Noto Serif, no system fallback. NEXT_OUTPUT_DIR optionally isolates Next build/dev output (default .next); font validation uses .next/font-check on port 3001 while the user server runs on 3000.
