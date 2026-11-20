# Capturing screenshots with Playwright

Optional. The client chooses: they may supply their own screenshots, which the skill takes as they are once confirmed, or ask for captures made with Playwright as below. Either way the screens show demo data and are labelled as such.

## Set-up

- **Run a copy of the app outside its repository**: a fresh clone or build in a temporary folder, so seeding and config changes never touch the client's working tree.
- **Use invented staff and data.** Seed the copy with made-up names, teams and records shaped like real use. Real people's data stays out of the captures; if a real record is unavoidable, blur the names before the file is saved.
- **Keep credentials off disk.** Pass any login secret through an environment variable for the session, sign in through the UI or an API call in the script, and leave out saved auth-state files, `.env` edits and secrets in the script itself.

## Capture

- **Mock the app's API routes** with `page.route()`, so every screen shows the same demo data on every run and nothing depends on a live backend:

  ```js
  await page.route("**/api/loans**", (route) =>
    route.fulfill({ json: demoLoans }),           // invented records shaped like the real API response
  );
  ```

  Take each response's shape from the app's real API (its code or a request seen in the browser), and fill it with invented values.
- **Dismiss onboarding tours, cookie banners and "what's new" pop-ups** before capturing: click their close control, or set the flag the app stores once they are dismissed.
- **Size the viewport to the screen's content.** Use a desktop width such as 1600 × 1000 for app screens, wider for timelines and boards, so wide views are not cut off; check the right edge of every capture. A `deviceScaleFactor` of 1 keeps the page light; use 2 only for small screens shown large.
- **Wait for the screen to settle**: `await page.waitForLoadState("networkidle")`, then wait for a known element, before `page.screenshot({ path })`.
- Save captures beside the content file (for example `screens/`), as PNG for flat UI or WebP for anything photographic.

## Before handing them over

Open every capture and confirm: demo data only, no real names, nothing cut off at the edges, no tour or banner showing, and the screen matches what its caption and callouts will claim. Then confirm the set with the user at the confirmation gate.
