import { chromium } from 'playwright-core';
import { spawn } from 'child_process';

async function runPhase5Verification() {
  console.log('=== PHASE 5 VERIFICATION: FULL REAL BROWSER AUDIT ===\n');

  // Start Vite Preview Server
  const preview = spawn('npx.cmd', ['vite', 'preview', '--port', '4173'], {
    shell: true,
    stdio: 'pipe'
  });

  // Give preview server a moment to boot
  await new Promise(resolve => setTimeout(resolve, 2000));

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  const results = [];
  function record(id, name, pass, details = '') {
    results.push({ id, name, pass, details });
    const tag = pass ? '✅ PASS' : '❌ FAIL';
    console.log(`${tag} [${id}] ${name} ${details ? `(${details})` : ''}`);
  }

  const consoleErrors = [];

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(`[Console Error]: ${msg.text()}`);
      }
    });

    page.on('pageerror', err => {
      consoleErrors.push(`[Page Error]: ${err.message}`);
    });

    // -------------------------------------------------------------
    // 1. Initial Load & No White Flash Check
    // -------------------------------------------------------------
    await page.goto('http://localhost:4173/');
    await page.waitForSelector('h1');

    // Check inline script ran before rendering
    const hasInlineScript = await page.evaluate(() => {
      const script = document.querySelector('head script');
      return script && script.textContent.includes('word_sprint_theme');
    });
    record('P5-FLASH', 'Inline head script present to prevent white flash', Boolean(hasInlineScript));

    // -------------------------------------------------------------
    // 2. Keyboard Navigation for Theme Toggle
    // -------------------------------------------------------------
    const toggleBtn = await page.waitForSelector('.theme-toggle-btn');
    await toggleBtn.focus();
    const isFocused = await page.evaluate(() => document.activeElement?.classList.contains('theme-toggle-btn'));
    record('P5-KB-01', 'Theme toggle button is focusable via keyboard', isFocused);

    const themeBeforeKey = await page.evaluate(() => document.documentElement.dataset.theme);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    const themeAfterEnter = await page.evaluate(() => document.documentElement.dataset.theme);
    record('P5-KB-02', 'Theme toggles on Enter keypress', themeBeforeKey !== themeAfterEnter, `${themeBeforeKey} -> ${themeAfterEnter}`);

    await page.keyboard.press('Space');
    await page.waitForTimeout(200);
    const themeAfterSpace = await page.evaluate(() => document.documentElement.dataset.theme);
    record('P5-KB-03', 'Theme toggles on Space keypress', themeAfterEnter !== themeAfterSpace, `${themeAfterEnter} -> ${themeAfterSpace}`);

    // -------------------------------------------------------------
    // 3. Theme Persistence across Page Reload
    // -------------------------------------------------------------
    // Force dark mode
    if (themeAfterSpace !== 'dark') {
      await toggleBtn.click();
      await page.waitForTimeout(200);
    }
    const currentThemeDark = await page.evaluate(() => document.documentElement.dataset.theme);
    record('P5-PERSIST-01', 'Theme set to dark mode prior to reload', currentThemeDark === 'dark');

    await page.reload();
    await page.waitForSelector('h1');
    const themeAfterReload = await page.evaluate(() => document.documentElement.dataset.theme);
    const storedTheme = await page.evaluate(() => localStorage.getItem('word_sprint_theme'));
    record('P5-PERSIST-02', 'Dark theme persists after page reload', themeAfterReload === 'dark' && storedTheme === 'dark', `Theme: ${themeAfterReload}`);

    // -------------------------------------------------------------
    // 4. Viewport & Theme Matrix (Home, Words, Stats, Modals)
    // -------------------------------------------------------------
    const viewports = [
      { name: 'Desktop (1280x800)', width: 1280, height: 800 },
      { name: 'Mobile (375x667)', width: 375, height: 667 }
    ];
    const themes = ['dark', 'light'];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      for (const th of themes) {
        // Ensure theme is set
        await page.evaluate((theme) => {
          document.documentElement.dataset.theme = theme;
          localStorage.setItem('word_sprint_theme', theme);
        }, th);
        await page.waitForTimeout(150);

        // A. Home Screen
        await page.click('button[aria-label="Milli home"]');
        await page.waitForSelector('h1');
        const homeOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
        record(`P5-LAYOUT-HOME-${vp.width}-${th}`, `Home Screen fits ${vp.name} [${th}] with no overflow`, homeOverflow);

        // Check Arabic text in navbar
        const arabicBrand = await page.textContent('.navbar');
        const hasArabicBrand = arabicBrand.includes('اضرب في الملي');
        record(`P5-ARABIC-NAV-${vp.width}-${th}`, `Arabic brand text readable on ${vp.name} [${th}]`, hasArabicBrand);

        // B. How to Play Modal
        const helpBtn = await page.waitForSelector('button[aria-label="How to play instructions"]');
        await helpBtn.click();
        await page.waitForSelector('.modal-content');
        const modalArabic = await page.textContent('.modal-content');
        const hasModalArabic = modalArabic.includes('اضرب في الملي');
        const modalOverflow = await page.evaluate(() => {
          const modal = document.querySelector('.modal-content');
          return modal ? modal.scrollWidth <= modal.clientWidth + 2 : false;
        });
        record(`P5-MODAL-HELP-${vp.width}-${th}`, `HowToPlayModal fits and displays Arabic [${vp.name}, ${th}]`, hasModalArabic && modalOverflow);
        const closeHelp = await page.waitForSelector('button[aria-label="Close instructions"]');
        await closeHelp.click();
        await page.waitForTimeout(150);

        // C. Settings Modal
        const settingsBtn = await page.waitForSelector('button[aria-label="Settings"]');
        await settingsBtn.click();
        await page.waitForSelector('.modal-content');
        const settingsOverflow = await page.evaluate(() => {
          const modal = document.querySelector('.modal-content');
          return modal ? modal.scrollWidth <= modal.clientWidth + 2 : false;
        });
        record(`P5-MODAL-SETTINGS-${vp.width}-${th}`, `SettingsModal fits [${vp.name}, ${th}]`, settingsOverflow);
        const closeSettings = await page.waitForSelector('button[aria-label="Close settings"]');
        await closeSettings.click();
        await page.waitForTimeout(150);

        // D. Vocabulary Library Screen
        const vocabTab = await page.waitForSelector('button[aria-label="My Vocabulary"]');
        await vocabTab.click();
        await page.waitForSelector('h1');
        const vocabOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
        record(`P5-LAYOUT-VOCAB-${vp.width}-${th}`, `Vocabulary Library fits ${vp.name} [${th}]`, vocabOverflow);

        // E. Statistics Dashboard Screen
        const statsTab = await page.waitForSelector('button[aria-label="Statistics"]');
        await statsTab.click();
        await page.waitForSelector('h1');
        const statsOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
        record(`P5-LAYOUT-STATS-${vp.width}-${th}`, `Statistics Dashboard fits ${vp.name} [${th}]`, statsOverflow);
      }
    }

    // -------------------------------------------------------------
    // 5. Play a Real Short Game: Full Countdown & Auto Game-Over
    // -------------------------------------------------------------
    console.log('\n--- PLAYING REAL SHORT GAME (COUNTDOWN, STATES & RESULTS) ---');
    await page.setViewportSize({ width: 375, height: 667 }); // Test on mobile

    // Navigate to Home
    await page.click('button[aria-label="Milli home"]');
    await page.waitForSelector('#start-game-btn');

    // Select 30s game
    const btn30s = await page.waitForSelector('button:has-text("30s")');
    await btn30s.click();

    // Start game
    await page.click('#start-game-btn');
    await page.waitForSelector('#timer-display');

    // Check initial timer ring offset at start (30s remaining -> fraction ~1.0, offset near 0)
    const initialOffset = await page.evaluate(() => {
      const circle = document.querySelector('[data-testid="timer-ring-progress"]');
      return parseFloat(circle?.getAttribute('stroke-dashoffset') || '0');
    });
    record('P5-GAME-01', 'Timer ring initialized with full ring', initialOffset < 10, `Offset: ${initialOffset}`);

    // Enter a valid answer for the current letter
    const currentLetter = (await page.textContent('#letter-display')).trim().charAt(0).toUpperCase();
    const firstInput = (await page.$$('.category-input'))[0];
    await firstInput.fill(currentLetter === 'A' ? 'Apple' : currentLetter + 'at');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(300);

    // Wait for timer to reach warning state (<= 30% of 30s = 9s, so 10s is urgent and <=9s is both)
    // For 30s game: 10s is urgent threshold
    console.log('Waiting for timer to reach <= 10s (urgent threshold)...');
    await page.waitForFunction(() => {
      const timer = document.getElementById('timer-display');
      return timer && timer.classList.contains('urgent');
    }, { timeout: 25000 });

    const isUrgentActive = await page.evaluate(() => {
      const timer = document.getElementById('timer-display');
      return timer ? timer.classList.contains('urgent') : false;
    });
    const urgentOffset = await page.evaluate(() => {
      const circle = document.querySelector('[data-testid="timer-ring-progress"]');
      return parseFloat(circle?.getAttribute('stroke-dashoffset') || '0');
    });
    record('P5-GAME-02', 'Timer ring enters urgent state at <= 10s and stroke offset has increased', isUrgentActive && urgentOffset > initialOffset, `Offset: ${urgentOffset}`);

    // Wait for timer to reach 0 and auto-transition to Results Screen
    console.log('Waiting for timer to hit 0 and transition to Results Screen...');
    await page.waitForSelector('text=Sprint Complete', { timeout: 15000 });
    const resultsHeader = await page.textContent('h1');
    record('P5-GAME-03', 'Game automatically ends at 0s and navigates to Results Screen', resultsHeader.includes('Points'), `Header: "${resultsHeader.trim()}"`);

    // Verify Results Screen on 375x667
    const resultsOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    record('P5-GAME-04', 'Results Screen fits 375x667 mobile viewport with no overflow', resultsOverflow);

    // -------------------------------------------------------------
    // 6. Console Error Check
    // -------------------------------------------------------------
    record('P5-CONSOLE', 'Zero console errors throughout all tests', consoleErrors.length === 0, consoleErrors.join('; '));

    await context.close();
  } catch (err) {
    console.error('Phase 5 Verification Error:', err);
    record('P5-EXEC', 'Execution succeeded without runtime exception', false, err.message);
  } finally {
    await browser.close();
    preview.kill();
  }

  const passCount = results.filter(r => r.pass).length;
  console.log(`\n=================================================`);
  console.log(`Phase 5 Audit Results: ${passCount}/${results.length} PASSED`);
  console.log(`=================================================`);

  if (passCount !== results.length) {
    process.exit(1);
  }
  process.exit(0);
}

runPhase5Verification();
