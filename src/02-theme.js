// ═══════════════════════════════════════════
//  THEMING & SETTINGS
// ═══════════════════════════════════════════
function loadSettings() {
  const defaultSettings = { appName: "<em>Ludex</em> Rating Companion", theme: "default" };
  try {
    const saved = JSON.parse(localStorage.getItem('lbx_settings')) || defaultSettings;
    applySettings(saved);
  } catch (e) {
    applySettings(defaultSettings);
  }
}

function applySettings(settings) {
  document.getElementById('main-app-title').innerHTML = settings.appName || "<em>Ludex</em> Rating Companion";
  
  let themeToApply = settings.theme || "default";
  
  if (themeToApply === "system") {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    themeToApply = prefersDark ? "default" : "filmnoir"; 
    
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (JSON.parse(localStorage.getItem('lbx_settings') || '{}').theme === 'system') {
            document.documentElement.setAttribute('data-theme', e.matches ? "default" : "filmnoir");
            renderAll();
        }
    });
  }
  
  document.documentElement.setAttribute('data-theme', themeToApply);
  
  document.getElementById('setting-app-name').value = (settings.appName || "").replace(/<\/?em>/g, '');
  const th = settings.theme || 'default';
  document.querySelectorAll('.theme-card').forEach(tc =>
    tc.classList.toggle('selected', tc.dataset.theme === th)
  );
}

document.getElementById('settings-btn').addEventListener('click', () => {
  document.getElementById('settings-modal').classList.add('open');
});

document.getElementById('settings-cancel').addEventListener('click', () => {
  const s = JSON.parse(localStorage.getItem('lbx_settings') || '{}');
  applySettings(s); 
  document.getElementById('settings-modal').classList.remove('open');
});

document.getElementById('theme-grid').addEventListener('click', e => {
  const card = e.target.closest('.theme-card');
  if (!card) return;
  document.querySelectorAll('.theme-card').forEach(tc => tc.classList.remove('selected'));
  card.classList.add('selected');
  if(card.dataset.theme !== "system") {
      document.documentElement.setAttribute('data-theme', card.dataset.theme);
  } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? "default" : "filmnoir");
  }
  renderAll();
});

document.getElementById('settings-save').addEventListener('click', () => {
  let rawName = document.getElementById('setting-app-name').value.trim();
  if(!rawName) rawName = "Ludex Rating Companion";
  const firstWord = rawName.split(' ')[0];
  const formattedName = rawName.replace(firstWord, `<em>${firstWord}</em>`);
  
  const newSettings = {
    appName: formattedName,
    theme: (document.querySelector('.theme-card.selected')||{dataset:{theme:'default'}}).dataset.theme
  };
  
  localStorage.setItem('lbx_settings', JSON.stringify(newSettings));
  applySettings(newSettings);
  renderAll();
  document.getElementById('settings-modal').classList.remove('open');
});

loadSettings();

