const { test, expect } = require('@playwright/test');

// Test dedie aux pastilles A/B/C/D et aux icones de resultat (correct/faux)
// ajoutees au Quiz du jour, isole du fichier daily-quiz.spec.js existant
// (qui presente un alea d'ordre entre ses deux tests, deja present avant ce
// changement et sans rapport avec lui — chaque test de ce fichier-la passe
// bien seul).

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
  await page.route('https://opentdb.com/**', async (route) => route.fulfill({
    json: mockOpenTdbResponse([
      { question: 'Qui a réalisé Pulp Fiction ?', correct: 'Quentin Tarantino', incorrect: ['Martin Scorsese', 'Steven Spielberg', 'David Fincher'] },
    ]),
  }));
});

test('les 4 reponses ont une pastille lettre A/B/C/D', async ({ page }) => {
  await page.goto('/');
  await page.click('#nav-discover');

  await page.evaluate(() => { const d = document.getElementById('play-wrap'); if (d) d.open = true; }); // Ludex 2.0 : Quiz/Duels repliés par défaut sous 'Jouer' — ouvert ici pour que le contenu reste interactif dans les tests
  await page.waitForSelector('#quiz-wrap[style*="display: block"]', { timeout: 8000 });

  const letters = await page.locator('.quiz-answer-letter').allTextContents();
  expect(letters).toEqual(['A', 'B', 'C', 'D']);
});

test('bonne reponse : icone check visible sur la bonne pastille', async ({ page }) => {
  await page.goto('/');
  await page.click('#nav-discover');

  await page.evaluate(() => { const d = document.getElementById('play-wrap'); if (d) d.open = true; }); // Ludex 2.0 : Quiz/Duels repliés par défaut sous 'Jouer' — ouvert ici pour que le contenu reste interactif dans les tests
  await page.waitForSelector('#quiz-wrap[style*="display: block"]', { timeout: 8000 });

  await page.locator('.quiz-answer-btn', { hasText: 'Quentin Tarantino' }).click();
  await expect(page.locator('.quiz-answer-btn.correct .quiz-answer-icon svg')).toBeVisible();
});

test('mauvaise reponse : icones check ET croix visibles sur les deux pastilles concernees', async ({ page }) => {
  await page.goto('/');
  await page.click('#nav-discover');

  await page.evaluate(() => { const d = document.getElementById('play-wrap'); if (d) d.open = true; }); // Ludex 2.0 : Quiz/Duels repliés par défaut sous 'Jouer' — ouvert ici pour que le contenu reste interactif dans les tests
  await page.waitForSelector('#quiz-wrap[style*="display: block"]', { timeout: 8000 });

  await page.locator('.quiz-answer-btn', { hasText: 'Martin Scorsese' }).click();
  await expect(page.locator('.quiz-answer-btn.wrong .quiz-answer-icon svg')).toBeVisible();
  await expect(page.locator('.quiz-answer-btn.correct .quiz-answer-icon svg')).toBeVisible();
});

test('les couleurs correct/faux suivent le theme actif (pas de rgba code en dur)', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lbx_settings', JSON.stringify({ theme: 'technicolor' })));
  await page.goto('/');
  await page.click('#nav-discover');

  await page.evaluate(() => { const d = document.getElementById('play-wrap'); if (d) d.open = true; }); // Ludex 2.0 : Quiz/Duels repliés par défaut sous 'Jouer' — ouvert ici pour que le contenu reste interactif dans les tests
  await page.waitForSelector('#quiz-wrap[style*="display: block"]', { timeout: 8000 });

  await page.locator('.quiz-answer-btn', { hasText: 'Quentin Tarantino' }).click();
  const bg = await page.locator('.quiz-answer-btn.correct').evaluate(el => getComputedStyle(el).backgroundColor);
  // Technicolor n'utilise pas rgba(90,160,90,...) — verifie juste que ce
  // n'est pas la valeur fixe de l'ancienne implementation, theme-independante.
  expect(bg).not.toBe('rgba(90, 160, 90, 0.18)');
});
