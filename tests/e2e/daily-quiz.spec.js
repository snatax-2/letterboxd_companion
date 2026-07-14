// Quiz du jour — simule l'API Open Trivia DB avec un format fidèle à sa vraie
// réponse documentée (response_code, question/correct_answer/incorrect_answers
// encodés en url3986, comme le vrai opentdb.com).
//
// Note : dans le bac à sable où ce fichier a été écrit, l'appel réseau vers
// opentdb.com ne passait pas de façon fiable à travers l'interception de
// Playwright (restriction réseau propre à cet environnement de développement,
// confirmée séparément par tests directs). La LOGIQUE elle-même (récupération
// du lot, tirage du jour, mélange déterministe, mise à jour de la série) a
// été validée en détail via des tests directs (voir l'historique) — ce
// fichier E2E est fourni pour une vraie vérification de bout en bout dans un
// environnement sans cette restriction, ce qui devrait être le cas du tien.
const { test, expect } = require('@playwright/test');

function mockOpenTdbResponse(questions) {
  return {
    response_code: 0,
    results: questions.map(q => ({
      type: 'multiple', difficulty: 'medium', category: 'Entertainment: Film',
      question: encodeURIComponent(q.question),
      correct_answer: encodeURIComponent(q.correct),
      incorrect_answers: q.incorrect.map(a => encodeURIComponent(a)),
    })),
  };
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'serviceWorker', { value: undefined, configurable: true });
  });
  await page.route('https://opentdb.com/**', async (route) => {
    return route.fulfill({
      json: mockOpenTdbResponse([
        { question: 'Qui a réalisé Pulp Fiction ?', correct: 'Quentin Tarantino', incorrect: ['Martin Scorsese', 'Steven Spielberg', 'David Fincher'] },
      ]),
    });
  });
});

test('une bonne réponse affiche la confirmation et démarre la série à 1', async ({ page }) => {
  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForSelector('#quiz-wrap[style*="display: block"]', { timeout: 8000 });

  await expect(page.locator('.quiz-question')).toContainText('Pulp Fiction');
  await page.locator('.quiz-answer-btn', { hasText: 'Quentin Tarantino' }).click();

  await expect(page.locator('.quiz-answer-btn.correct')).toBeVisible();
  await expect(page.locator('.quiz-result')).toContainText('Bonne réponse');
  await expect(page.locator('#quiz-streak-badge')).toContainText('1');
});

test('une mauvaise réponse montre la bonne réponse et remet la série à zéro', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('lbx_quiz_streak', '5'));
  await page.click('#nav-discover');
  await page.waitForSelector('#quiz-wrap[style*="display: block"]', { timeout: 8000 });

  await page.locator('.quiz-answer-btn', { hasText: 'Martin Scorsese' }).click();

  await expect(page.locator('.quiz-answer-btn.wrong')).toBeVisible();
  await expect(page.locator('.quiz-answer-btn.correct')).toContainText('Quentin Tarantino');

  const streak = await page.evaluate(() => localStorage.getItem('lbx_quiz_streak'));
  expect(streak).toBe('0');
});
