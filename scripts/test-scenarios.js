// Automated verification script for Milli acceptance criteria
import { validateAnswer } from '../src/services/validationService.ts';

async function runTests() {
  console.log('--- RUNNING MILLI VERIFICATION TESTS ---');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  const used = new Set();

  // Test 1: Valid Noun with correct letter
  const res1 = await validateAnswer('Apple', 'food', 'A', used);
  assert(res1.status === 'valid' && res1.pointsEarned === 10, 'Valid food "Apple" with letter A earns 10 pts');
  used.add(res1.normalizedWord);

  // Test 2: Wrong starting letter
  const res2 = await validateAnswer('Banana', 'food', 'A', used);
  assert(res2.status === 'invalid' && res2.pointsEarned === 0, 'Wrong letter word "Banana" with letter A earns 0 pts');

  // Test 3: Empty input
  const res3 = await validateAnswer('', 'noun', 'A', used);
  assert(res3.status === 'empty' && res3.pointsEarned === 0, 'Empty field earns 0 pts without error');

  // Test 4: Duplicate in same game
  const res4 = await validateAnswer('apple', 'food', 'A', used);
  assert(res4.status === 'duplicate' && res4.pointsEarned === 0, 'Duplicate "apple" earns 0 pts and is flagged');

  // Test 5: Country / City check
  const res5 = await validateAnswer('Australia', 'country_city', 'A', used);
  assert(res5.status === 'valid' && res5.pointsEarned === 10, 'Recognized country "Australia" earns 10 pts');

  const res6 = await validateAnswer('Amsterdam', 'country_city', 'A', used);
  assert(res6.status === 'valid' && res6.pointsEarned === 10, 'Recognized city "Amsterdam" earns 10 pts');

  // Test 6: Invalid country / city
  const res7 = await validateAnswer('AtlantisFakePlace', 'country_city', 'A', used);
  assert(res7.status === 'invalid' && res7.pointsEarned === 0, 'Fake place "AtlantisFakePlace" is rejected');

  // Test 7: Capitalization normalization
  const res8 = await validateAnswer('   AMAZING   ', 'adjective', 'A', used);
  assert(res8.status === 'valid' && res8.pointsEarned === 10 && res8.normalizedWord === 'amazing', 'Capitalization and excess whitespace normalized');

  // Test 8: Verb test
  const res9 = await validateAnswer('Ask', 'verb', 'A', used);
  assert(res9.status === 'valid' && res9.pointsEarned === 10, 'Verb "Ask" recognized and earns 10 pts');

  // Test 9: Unverified nonsense word
  const res10 = await validateAnswer('Axyzqwert', 'noun', 'A', used);
  assert(
    (res10.status === 'invalid' || res10.status === 'review') && res10.pointsEarned === 0,
    'Nonsense word "Axyzqwert" rejected without false pass'
  );

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});

