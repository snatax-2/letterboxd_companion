const { test, expect } = require('@playwright/test');

// Branding : favicon, PWA, Apple Touch Icon, image de partage.
//
// Ce fichier existe parce que quatre défauts bien réels vivaient ici sans que
// rien ne les signale :
//   1. le manifest déclarait le MÊME carré en purpose "any" ET "maskable" —
//      or une icône maskable a besoin d'environ 10% de zone de sécurité, donc
//      Android rognait dans l'illustration ;
//   2. og:image et twitter:image pointaient sur le favicon 32x32, très en
//      dessous des 1200x630 attendus : partager un lien ne montrait aucune
//      image ;
//   3. l'écran de démarrage affichait ce même favicon 32x32 agrandi à 88px,
//      soit 2,75x — visiblement flou sur un écran haute densité ;
//   4. rien ne garantissait que les fichiers déclarés existaient vraiment ni
//      qu'ils avaient les dimensions annoncées.
//
// Aucun de ces quatre points n'aurait fait rougir un test. Ils le feraient
// maintenant.

// Lit la largeur et la hauteur d'un PNG depuis son en-tête IHDR, sans
// dépendance : les octets 16 à 24 d'un PNG valide portent width et height en
// entiers 32 bits gros-boutistes.
function dimensionsPng(buffer) {
  expect(buffer.subarray(0, 8).toString('hex'),
    'signature PNG attendue').toBe('89504e470d0a1a0a');
  return { largeur: buffer.readUInt32BE(16), hauteur: buffer.readUInt32BE(20) };
}

async function telecharger(request, chemin) {
  const reponse = await request.get(chemin);
  expect(reponse.status(), `${chemin} doit être servi`).toBe(200);
  return Buffer.from(await reponse.body());
}

test('le manifest déclare des icônes maskable DISTINCTES des icônes normales', async ({ request }) => {
  const manifest = await (await request.get('/manifest.json')).json();

  const normales = manifest.icons.filter(i => i.purpose === 'any');
  const maskables = manifest.icons.filter(i => i.purpose === 'maskable');
  expect(normales.length, 'au moins une icône "any"').toBeGreaterThan(0);
  expect(maskables.length, 'au moins une icône "maskable"').toBeGreaterThan(0);

  // Le cœur du correctif : un fichier ne peut pas servir aux deux usages.
  // Une icône pensée pour être affichée telle quelle et une icône pensée pour
  // être rognée par un masque système sont deux cadrages différents.
  const fichiersNormaux = new Set(normales.map(i => i.src));
  for (const m of maskables) {
    expect(fichiersNormaux.has(m.src),
      `${m.src} est déclarée à la fois "any" et "maskable" — il faut deux cadrages distincts`).toBe(false);
  }
});

test('toutes les icônes déclarées existent et font la taille annoncée', async ({ request }) => {
  const manifest = await (await request.get('/manifest.json')).json();

  for (const icone of manifest.icons) {
    const buffer = await telecharger(request, '/' + icone.src);
    const { largeur, hauteur } = dimensionsPng(buffer);
    const [attendueL, attendueH] = icone.sizes.split('x').map(Number);
    expect(largeur, `${icone.src} : largeur`).toBe(attendueL);
    expect(hauteur, `${icone.src} : hauteur`).toBe(attendueH);
    // Le ratio ne doit jamais être déformé : une icône d'app est carrée.
    expect(largeur, `${icone.src} doit rester carrée`).toBe(hauteur);
  }
});

test('favicon et Apple Touch Icon sont référencés et servis', async ({ page, request }) => {
  await page.goto('/');

  const favicon = await page.locator('link[rel="icon"]').getAttribute('href');
  const apple = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
  expect(favicon, 'un favicon doit être déclaré').toBeTruthy();
  expect(apple, 'un Apple Touch Icon doit être déclaré').toBeTruthy();

  const { largeur: lFavicon } = dimensionsPng(await telecharger(request, '/' + favicon));
  expect(lFavicon, 'favicon : 32px suffit et reste net').toBeGreaterThanOrEqual(32);

  // 180x180 est la taille attendue par iOS pour un écran d'accueil récent.
  const { largeur: lApple, hauteur: hApple } = dimensionsPng(await telecharger(request, '/' + apple));
  expect(lApple, 'Apple Touch Icon : au moins 180px').toBeGreaterThanOrEqual(180);
  expect(lApple, 'Apple Touch Icon : carré').toBe(hApple);
});

test("l'image de partage social fait vraiment 1200x630, pas la taille d'un favicon", async ({ page, request }) => {
  await page.goto('/');

  const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
  const twImage = await page.locator('meta[name="twitter:image"]').getAttribute('content');
  expect(ogImage).toBeTruthy();

  // Le piège précis qu'on a corrigé : les deux pointaient sur favicon.png.
  expect(ogImage, 'og:image ne doit pas être le favicon').not.toContain('favicon');
  expect(twImage, 'twitter:image ne doit pas être le favicon').not.toContain('favicon');

  const chemin = '/' + ogImage.split('/').pop();
  const { largeur, hauteur } = dimensionsPng(await telecharger(request, chemin));
  expect(largeur, 'og:image largeur').toBe(1200);
  expect(hauteur, 'og:image hauteur').toBe(630);

  // Les dimensions annoncées dans les balises doivent correspondre au fichier,
  // sinon les aperçus se recadrent de travers.
  expect(await page.locator('meta[property="og:image:width"]').getAttribute('content')).toBe(String(largeur));
  expect(await page.locator('meta[property="og:image:height"]').getAttribute('content')).toBe(String(hauteur));
});

test("l'écran de démarrage utilise une source plus grande que sa taille d'affichage", async ({ request }) => {
  // Lu dans le HTML SERVI, pas dans le DOM vivant : hideSplash()
  // (09-modal-init.js) retire le nœud environ 1,7s après le chargement, donc
  // interroger la page ferait la course avec cette suppression. Le balisage
  // livré est de toute façon la source de vérité pour ce qu'on expédie.
  const reponse = await request.get('/');
  expect(reponse.status()).toBe(200);
  const markup = await reponse.text();

  const bloc = markup.match(/<div id="app-splash"[\s\S]*?<\/div>/);
  expect(bloc, "le bloc #app-splash doit exister dans le HTML livré").toBeTruthy();

  const src = bloc[0].match(/<img[^>]*\ssrc="([^"]+)"/)?.[1];
  const largeurAffichee = Number(bloc[0].match(/<img[^>]*\swidth="(\d+)"/)?.[1]);
  expect(src, "l'image de démarrage doit avoir un src").toBeTruthy();
  expect(largeurAffichee, "l'image de démarrage doit déclarer sa largeur d'affichage").toBeGreaterThan(0);

  const { largeur } = dimensionsPng(await telecharger(request, '/' + src));

  // Facteur 2 minimum : en dessous, l'image est visiblement floue sur un écran
  // haute densité, exactement le défaut qu'on vient de corriger (source de
  // 32px pour 88px affichés, soit 2,75x d'agrandissement).
  expect(largeur, `${src} fait ${largeur}px de source pour ${largeurAffichee}px affichés — il en faut au moins le double`)
    .toBeGreaterThanOrEqual(largeurAffichee * 2);
});

test("le service worker et le manifest s'accordent sur la couleur de fond", async ({ page, request }) => {
  const manifest = await (await request.get('/manifest.json')).json();
  await page.goto('/');

  // background_color sert à l'écran de lancement natif de la PWA, avant que
  // la moindre ligne de CSS ne soit appliquée : s'il diverge du fond réel de
  // l'app, le lancement produit un flash de la mauvaise couleur.
  const fondReel = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--bg').trim().toLowerCase());
  expect(manifest.background_color.toLowerCase(),
    'background_color du manifest doit valoir le --bg du thème par défaut').toBe(fondReel);
});
