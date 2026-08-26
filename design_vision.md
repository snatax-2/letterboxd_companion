# Refonte Esthétique : LUDEX RATING COMPANION

## 1. Analyse de la personnalité actuelle

**Personnalité actuelle :** Ludex est actuellement un outil pratique, un "compagnon" fonctionnel. L'abondance de thèmes (Film Noir, Carnet, Technicolor, etc.) démontre une volonté de personnalisation, mais dilue l'identité de marque. Ludex n'a pas *sa* propre voix, il emprunte celle que l'utilisateur choisit.
**Émotion provoquée :** Utilitarisme rassurant. C'est un tracker efficace.
**Identité :** Générique. Le design system sous-jacent est très bien codé, mais l'empilement visuel (bordures, ombres, backgrounds) manque d'une véritable signature de marque.
**Ce qui fait "Template" / "Amateur" :**
- La présence de 6 thèmes radicalement différents casse la notion de "Design System de marque". Une app premium impose sa DA.
- L'utilisation de bordures pleines partout (`1px solid var(--border)` sur presque chaque conteneur) enferme le contenu dans des boîtes.
- Les icônes SVG en `currentColor` sans traitement particulier.
- Le bouton "Noter" flottant ou avec un effet de "pop" très prononcé.
**Ce qui est bon et à conserver :**
- L'usage de l'affiche de film (format 2:3) comme ancrage visuel absolu.
- La récupération intelligente de la couleur dominante de l'affiche (`--poster-accent`).
- La fluidité technique (absence de rechargement).

---

## 🎨 Direction artistique proposée : "Archives & Éditorial"

Si Ludex était une entité physique, ce serait **une revue de cinéma indépendante haut de gamme**, imprimée sur un papier mat texturé, avec une reliure parfaite. Pensez aux éditions A24, au magazine *Sight & Sound* ou aux catalogues d'expositions de la Cinémathèque.

Caractère en 6 adjectifs :
**Éditoriale · Cinématographique · Tactile · Sophistiquée · Intemporelle · Contrastée**

Ludex doit abandonner le concept de "thèmes multiples" pour embrasser **une seule identité souveraine**, déclinable en clair/sombre, où le film (l'image) explose sur un fond neutre et extrêmement structuré.

---

## 🧠 L'idée derrière le design

L'utilisateur ne doit plus avoir l'impression de remplir un formulaire de base de données. Il doit avoir l'impression de **rédiger ou de consulter une archive précieuse**. L'émotion recherchée est le recueillement et le respect de l'œuvre. Le design doit s'effacer pour laisser place à la photographie du film, tout en soutenant l'information par une typographie stricte et noble.

---

## ⭐ Les 10 changements visuels les plus importants

1. **Suppression des thèmes multiples au profit d'une DA unique (Dark/Light mode uniquement).** Fin du bariolage, place à une identité de marque inébranlable. *(Impact: Énorme, UX: Moyen, Compl: Moyenne, Priorité: P0)*
2. **"Unboxing" du contenu : suppression de 80% des bordures.** Utiliser l'espace négatif, l'asymétrie et la typographie pour délimiter les sections plutôt que de dessiner des traits autour de chaque div. *(Impact: Fort, UX: Moyen, Compl: Faible, Priorité: P0)*
3. **Typographie "Editorial Hero".** Remplacer le mélange de Google Fonts par un duo imparable : une police Serif dramatique pour les titres d'œuvres, et une police Sans-Serif géométrique stricte pour l'UI. *(Impact: Énorme, UX: Fort, Compl: Faible, Priorité: P0)*
4. **Refonte complète de la Fiche Film (Movie Detail).** Fin du layout "Hero Header classique". Passer sur une composition magazine : l'affiche en très grand, coupée à moitié par le bord de l'écran, avec le texte qui vient habiller l'espace libre de manière asymétrique. *(Impact: Fort, UX: Fort, Compl: Élevée, Priorité: P1)*
5. **Couleurs : Le Noir absolu et le Blanc Cassé.** Palette ultra-restreinte. Le seul élément coloré doit être l'affiche du film et son `--poster-accent` distillé avec une précision chirurgicale (ex: uniquement sur les étoiles de notation). *(Impact: Fort, UX: Faible, Compl: Faible, Priorité: P1)*
6. **Cartes d'Historique "Pellicule".** Retirer le fond de couleur de la carte. Laisser l'affiche exister seule avec la typographie qui flotte à sa droite ou en dessous, sans conteneur visible. *(Impact: Moyen, UX: Moyen, Compl: Moyenne, Priorité: P2)*
7. **Boutons textuels "Ghost" plutôt que des pilules pleines.** Remplacer les boutons très lourds par une typographie forte, soulignée au hover, ou des boutons outline très fins. *(Impact: Moyen, UX: Moyen, Compl: Faible, Priorité: P2)*
8. **Navigation inférieure (Mobile) invisible.** Une barre de navigation en verre dépoli (blur extrême) sans bordures dures, avec des icônes filaires très fines (stroke: 1px). *(Impact: Moyen, UX: Fort, Compl: Faible, Priorité: P2)*
9. **Micro-interactions sur l'Affiche.** Un effet d'apparition (fade + léger scale down) inspiré de la mise au point d'un projecteur lors du chargement des affiches. *(Impact: Faible, UX: Faible, Compl: Faible, Priorité: P3)*
10. **Refonte de la notation.** Les étoiles ne doivent plus être des SVG basiques jaunes, mais de fins contours argentés ou dorés subtils qui se remplissent avec un "glow" très discret au tap. *(Impact: Moyen, UX: Fort, Compl: Moyenne, Priorité: P3)*

---

## 🎨 Palette

Une palette volontairement drastique, inspirée de la pellicule N&B et du papier glacé.

*   **Background (Dark Mode) :** `#0A0A0C` (Noir profond, très légèrement teinté de bleu nuit, comme une salle obscure).
*   **Background (Light Mode) :** `#F5F4F0` (Blanc cassé, "Off-white", papier texturé).
*   **Surface Elevée :** Blur extrême (Glassmorphism maîtrisé) avec `rgba(10,10,12, 0.65)` + `backdrop-filter: blur(24px)`.
*   **Texte Principal :** `#FAFAFA` (Dark) / `#111111` (Light).
*   **Texte Secondaire :** `#888888` (Équilibre parfait de gris).
*   **Accent Principal :** La couleur dominante de l'affiche actuelle (`--poster-accent`).
*   **Accent UI (Si pas d'affiche) :** `#D4AF37` (Un or patiné, discret, ni jaune vif ni orange).
*   **Bordures (rares) :** `#222222` (Dark) / `#E0E0E0` (Light).

---

## 🔤 Typographie

La typographie devient l'âme de Ludex. On passe à deux familles distinctes avec des rôles stricts.

**1. Display & Serif (L'Œuvre)**
*Police recommandée :* **Playfair Display** ou **Cormorant Garamond** (Italique privilégié pour les titres de films).
*Rôle :* Uniquement pour le nom du film, de la série, ou du réalisateur. Elle apporte la touche cinéphile et élégante.

**2. UI & Sans-Serif (La Data)**
*Police recommandée :* **Inter** ou **Geist** (Tracking ajusté, géométrique).
*Rôle :* Tout le reste. Les menus, les boutons, les statistiques, les descriptions.

**Hiérarchie stricte :**
*   **Display XL:** 3.5rem, Serif Italique, Lettres serrées. (Titre du film sur sa fiche).
*   **Heading M:** 1.25rem, Sans-Serif, Uppercase, Tracking +0.05em, Bold. (Titres de sections : HISTORIQUE, CASTING).
*   **Body:** 0.9rem, Sans-Serif, Regular, Line-height 1.6. (Critiques, Synopsis).
*   **Micro Data:** 0.7rem, Sans-Serif Mono (ex: JetBrains Mono), Uppercase. (Année, Durée, Notes /10).

---

## 📐 Spacing & Proportions

Finis les paddings symétriques (ex: `padding: 16px`). Place à l'asymétrie éditoriale.

*   **Règle du double espacement vertical :** L'espace entre deux sections doit toujours être le double de l'espace horizontal sur les marges extérieures. Cela crée des "respirations".
*   **Éviction du `border-radius: 8px` générique :**
    *   Les affiches n'ont quasiment plus de radius (`border-radius: 2px` pour casser le pixel brut, pas plus).
    *   Les modales ou sheets ont des coins très arrondis en haut (`24px`) pour le contraste "Digital vs Analogique".

---

## 🧩 Composants

*   **Cards (Historique / Découverte) :** Suppression de la carte physique. L'affiche existe seule. Le texte "flotte" de manière alignée. Pas de background, pas de bordure, pas de shadow. Juste l'image et la typo.
*   **Boutons :** Disparition des gros boutons pleins ronds. Utilisation de boutons rectangulaires (radius 2px) avec bordure `1px solid var(--border)` et texte uppercase `Heading M`. Au hover, le fond devient très légèrement gris.
*   **Badges & Tags :** Terminés les tags avec `background: rgba(...)`. Utilisation exclusive de texte pur (Micro Data) séparé par des points médians (`·`) ou de très fins cercles filaires (`border: 1px solid`).
*   **Barre de recherche :** Invisible. Juste une ligne inférieure (`border-bottom: 1px solid var(--text)`) sans fond, avec une icône loupe très fine.

---

## ✨ Motion & Micro-interactions

Le principe est la **gravité** et la **mise au point**.

*   **Chargement d'affiche :** Pas de shimmer effect grisâtre de template. L'affiche passe de `filter: blur(10px)` et `opacity: 0` à net et visible, en 600ms avec `--ease-out`. (Effet projecteur de cinéma).
*   **Hover sur les affiches (Desktop) :** Un très léger "Push in" (Scale 0.98, pas 1.05 ! On n'agrandit pas, on enfonce dans la page).
*   **Ouverture de la Fiche Film :** Un `Slide Up` fluide de la page (Bottom Sheet), mais le fond de l'application derrière ne disparaît pas dans un overlay noir, il subit un "Scale down" (0.95) et un blur léger, donnant un effet 3D théâtral (iOS style).
*   **Remplissage d'Étoile :** L'étoile se dessine en contour (Draw SVG) puis se remplit en fondu enchaîné sur 200ms.

---

## 📱 Mobile

L'expérience mobile doit être "Thumb-driven" et immersive.

*   **Header disparu :** Plus de "LUDEX RATING COMPANION" en haut. Le contenu commence directement par de magnifiques affiches "Choix du jour" bord à bord, derrière la Dynamic Island / l'encoche.
*   **Navigation Flottante :** Une pilule de verre dépoli en bas (Bottom 24px), très fine, contenant uniquement les icônes vectorielles (stroke: 1.2px) sans texte. Le bouton actif devient blanc ou noir plein, les autres sont grisés. Pas de bouton orange gigantesque.
*   **Fiche film "Full Bleed" :** L'affiche prend 60% de l'écran supérieur, le titre vient mordre sur l'affiche en bas, et le contenu défile *sur* l'affiche via une interaction de type "scroll-parallax".

---

## 🧹 Ce qu'il faut supprimer

Pour atteindre le côté haut de gamme, il faut supprimer :

1.  **Le système de thèmes multiples.** C'est la mort d'une identité forte.
2.  **Tous les `box-shadow` génériques** (`--shadow-1`, etc.) utilisés pour séparer des blocs. La séparation se fait par l'espace.
3.  **Les bordures autour des cartes.**
4.  **Les icônes trop épaisses** (`stroke-width: 2` ou `2.2`). Passer à du 1.2px ou 1.5px.
5.  **Les couleurs statutaires criardes** (Le vert fluo pour "Vu", le rouge vif). Utiliser des teintes désaturées ou uniquement des icônes filaires signifiantes.
6.  **Le bouton "Noter" (Primary CTA) sur le layout Desktop.** Il doit s'intégrer harmonieusement à la top-bar ou s'afficher en hover contextuel, pas clignoter.

---

## 🚀 Plan de transformation

1.  **Purge CSS (P0) :** Supprimer la gestion complexe des `[data-theme="..."]`. Réduire `styles.css` à ses variables essentielles (Dark/Light).
2.  **Reset Typographique (P0) :** Intégrer les deux nouvelles polices (Serif/Sans-Serif) et nettoyer toutes les tailles arbitraires pour implémenter les 4 niveaux stricts de la hiérarchie.
3.  **Unboxing (P1) :** Parcourir les composants (`.card`, `.hist-item`, `.wl-card`) et supprimer les `background`, `border`, `border-radius`, et `box-shadow`.
4.  **Refonte de l'Historique / Grilles (P1) :** Ajuster le CSS Grid pour que les affiches s'alignent parfaitement bord à bord avec un `gap` précis, et que la typographie suive.
5.  **Refonte de la Navigation (P2) :** Transformer la navigation mobile en une "Pill" en verre dépoli (Glassmorphism subtil) avec des icônes allégées.
6.  **Editorialisation de la Fiche Détail (P2) :** Réécrire la structure HTML/CSS de `#movie-detail-sheet` pour implémenter la DA "Magazine" (Affiche massive, titre débordant).
7.  **Polish des Interactions (P3) :** Implémenter les animations de focus (blur to sharp) et revoir le comportement du scroll (Parallax des affiches).

---

# Le résultat recherché

Une fois la refonte terminée, Ludex ne ressemblera plus à une application web construite avec des composants standards, mais à **un bel objet numérique**. Lorsqu'un utilisateur ouvrira Ludex, il sera frappé par l'élégance du vide, la puissance des affiches de cinéma qui s'expriment sans être enfermées dans des boîtes, et une typographie racée qui donne de la valeur à la moindre petite donnée (année, durée, score). L'application respirera la maîtrise, la confiance et le respect de l'art cinématographique. Ce sera l'équivalent digital d'une luxueuse édition Blu-ray ou d'une revue d'art.