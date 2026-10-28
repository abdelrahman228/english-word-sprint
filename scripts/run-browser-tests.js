import { chromium } from 'playwright-core';

async function runBrowserTests() {
  console.log('=== RUNNING REAL BROWSER (CHROME) TESTS ON http://localhost:4173/ ===\n');

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

  try {
    // Desktop Context
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();

    // BROWSER-01: Welcome screen title and instructions
    await page.goto('http://localhost:4173/');
    await page.waitForSelector('h1');
    const title = await page.textContent('h1');
    record('BROWSER-01', 'Welcome screen title rendered', title.includes('English Word Sprint'), `Found "${title.trim()}"`);

    // BROWSER-02: Difficulty and Duration selectors
    const beginnerBtn = await page.$('button:has-text("Beginner")');
    const interBtn = await page.$('button:has-text("Intermediate")');
    const advBtn = await page.$('button:has-text("Advanced")');
    const durationBtn = await page.$('button:has-text("60s")');
    record('BROWSER-02', 'Difficulty and Duration selector buttons present', Boolean(beginnerBtn && interBtn && advBtn && durationBtn));

    // BROWSER-03: Responsive 375x667 mobile viewport check in separate mobile context
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 667 }
    });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto('http://localhost:4173/');
    await mobilePage.waitForSelector('h1');
    const scrollWidth = await mobilePage.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await mobilePage.evaluate(() => document.documentElement.clientWidth);
    record('BROWSER-03', 'Mobile 375x667 viewport has no horizontal overflow', scrollWidth <= clientWidth, `scrollWidth: ${scrollWidth}px, clientWidth: ${clientWidth}px`);
    await mobileContext.close();

    // BROWSER-04: Start Game button transitions to GameScreen with active timer
    await page.click('#start-game-btn');
    await page.waitForSelector('#timer-display');
    const timerText = await page.textContent('.timer-val');
    record('BROWSER-04', 'GameScreen loaded with active timer display', Boolean(timerText), `Timer: ${timerText.trim()}`);

    // BROWSER-05: Exactly 5 category inputs present
    const inputs = await page.$$('.category-input');
    record('BROWSER-05', 'Exactly 5 category input fields present', inputs.length === 5, `Found ${inputs.length} inputs`);

    // BROWSER-06: First input field auto-focused
    const isFirstFocused = await page.evaluate(() => {
      const active = document.activeElement;
      const first = document.querySelector('.category-input');
      return active === first;
    });
    record('BROWSER-06', 'First input field automatically focused on round start', isFirstFocused);

    // BROWSER-07: Partial hint button displays clue without direct answer autofill
    const hintButtons = await page.$$('.hint-btn');
    if (hintButtons.length > 0) {
      await hintButtons[0].click();
      await page.waitForSelector('text=Clue for', { timeout: 3000 });
      const modalContent = await page.textContent('.modal-content');
      const hasPattern = modalContent.includes('letters');
      const hasAutoFill = modalContent.includes('Fill Answer') || modalContent.includes('Use Word');
      record('BROWSER-07', 'Hint reveals partial pattern without auto-fill button', hasPattern && !hasAutoFill, 'Contains partial clue pattern, no auto-fill');
      await page.click('button:has-text("I Know It!")');
    } else {
      record('BROWSER-07', 'Hint button present for Beginner difficulty', false);
    }

    // BROWSER-08: Enter answer and submit round
    const currentLetter = (await page.textContent('#letter-display')).trim().charAt(0).toUpperCase();
    await inputs[0].fill(currentLetter === 'A' ? 'Apple' : currentLetter + 'at');
    // Press Tab and submit
    await page.keyboard.press('Tab');
    const submitBtn = await page.waitForSelector('button:has-text("Submit Answers")');
    await submitBtn.click();
    await page.waitForTimeout(600);

    const scoreText = await page.textContent('#score-display .stat-chip-val');
    record('BROWSER-08', 'Round submission processed and score displayed', Boolean(scoreText), `Score: ${scoreText.trim()}`);

    // BROWSER-09: End Game button finishes round and navigates to Results screen
    const endBtn = await page.waitForSelector('button:has-text("End Game")');
    await endBtn.click();
    await page.waitForSelector('text=Sprint Complete', { timeout: 5000 });
    const resultsScore = await page.textContent('h1');
    record('BROWSER-09', 'End Game transitions to Sprint Complete results screen', resultsScore.includes('Points'), `Score Banner: "${resultsScore.trim()}"`);

    // BROWSER-10: Results screen shows personal best / stats and Play Again button
    const playAgainBtn = await page.$('button:has-text("Play Again")');
    record('BROWSER-10', 'Play Again button present on results screen', Boolean(playAgainBtn));

    await context.close();
  } catch (err) {
    console.error('Browser test error:', err);
  } finally {
    await browser.close();
  }

  const passCount = results.filter(r => r.pass).length;
  console.log(`\nBrowser Tests Complete: ${passCount}/${results.length} PASSED`);
  if (passCount !== results.length) {
    process.exit(1);
  }
}

runBrowserTests();
