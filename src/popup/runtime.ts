import { DEFAULT_SETTINGS, type ExtensionSettings, readSettings, writeSettings } from '@shared/settings';
import { applyThemePreference } from '@shared/theme';

type StorageLike = {
  get: (key: string) => Promise<Record<string, unknown>>;
  set: (value: Record<string, unknown>) => Promise<void>;
};

type PopupEnvironment = {
  storage: StorageLike;
  getCurrentPageStats: () => Promise<{ hiddenCount: number }>;
  openOptionsPage: () => Promise<void> | void;
  window?: Window;
};

const SURFACE_FIELDS: Array<{ key: keyof ExtensionSettings['surfaces']; label: string; title: string }> = [
  { key: 'channel', label: 'Paginas de canal', title: 'Filtra videos para miembros en canales.' },
  { key: 'recommendations', label: 'Recomendaciones', title: 'Filtra videos para miembros en relacionados y sugerencias.' },
  { key: 'home', label: 'Inicio', title: 'Filtra videos para miembros en la pagina principal.' },
  { key: 'search', label: 'Busqueda', title: 'Filtra videos para miembros en resultados de busqueda.' },
  { key: 'subscriptions', label: 'Suscripciones', title: 'Filtra videos para miembros en suscripciones.' }
];

function renderToggleRow(
  id: string,
  label: string,
  checked: boolean,
  disabled: boolean,
  title: string,
  options?: { child?: boolean; note?: string; strong?: boolean }
) {
  const classes = [
    'setting-row',
    options?.child ? 'setting-row-child' : '',
    options?.strong ? 'setting-row-global' : '',
    disabled ? 'is-disabled' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return `
    <label class="${classes}" title="${title}">
      <span class="toggle-switch">
        <input class="toggle-input" type="checkbox" id="${id}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''} />
        <span class="toggle-slider" aria-hidden="true"></span>
      </span>
      <span class="setting-copy">
        <span class="setting-label">${label}</span>
        ${options?.note ? `<span class="setting-note">${options.note}</span>` : ''}
      </span>
    </label>
  `;
}

function renderStatRow(label: string, value: number | string) {
  return `
    <div class="stat-row">
      <span class="stat-label">${label}</span>
      <span class="stat-value">${value}</span>
    </div>
  `;
}

function renderPopup(document: Document, settings: ExtensionSettings, pageHiddenCount: number) {
  const form = document.querySelector('#popup-form');
  if (!(form instanceof HTMLFormElement)) {
    throw new Error('popup form host not found');
  }

  const surfaceRows = SURFACE_FIELDS.map((surface, index) => {
    const row = renderToggleRow(
      `surface-${surface.key}`,
      surface.label,
      settings.surfaces[surface.key],
      !settings.enabled,
      surface.title,
      { child: true }
    );
    const separator = index < SURFACE_FIELDS.length - 1 ? '<div class="row-separator"></div>' : '';
    return row + separator;
  }).join('');

  form.innerHTML = `
    <div class="popup-shell">
      <header class="popup-header">
        <h1>Filtro de miembros</h1>
        <p>Oculta contenido para miembros sin interrumpir tu navegacion.</p>
      </header>

      <section class="settings-card">
        ${renderToggleRow(
          'setting-enabled',
          'Activar filtro',
          settings.enabled,
          false,
          'Activa o desactiva el filtro completo.',
          { note: 'Activa el filtro en YouTube' }
        )}
      </section>

      <div class="section-group">
        <p class="section-title">Superficies</p>
        <section class="settings-card">
          ${surfaceRows}
        </section>
      </div>

      <div class="section-group">
        <p class="section-title">Estadisticas</p>
        <section class="settings-card stats-group">
          ${renderStatRow('En esta pagina', pageHiddenCount)}
          <div class="row-separator"></div>
          ${renderStatRow('Total ocultados', settings.stats.totalHiddenCount)}
        </section>
      </div>

      <section class="config-section settings-card">
        <button type="button" id="open-options" class="config-link">
          <span class="config-copy">
            <span class="config-label">Whitelist y ajustes</span>
            <span class="config-note">Gestiona canales permitidos, tema y contador.</span>
          </span>
          <span class="config-chevron" aria-hidden="true"></span>
        </button>
      </section>
    </div>
  `;
}

function readCurrentSettings(document: Document): ExtensionSettings {
  const globalToggle = document.querySelector<HTMLInputElement>('#setting-enabled');
  if (!globalToggle) {
    return DEFAULT_SETTINGS;
  }

  return {
    enabled: globalToggle.checked,
    surfaces: {
      channel: document.querySelector<HTMLInputElement>('#surface-channel')?.checked ?? true,
      recommendations: document.querySelector<HTMLInputElement>('#surface-recommendations')?.checked ?? true,
      home: document.querySelector<HTMLInputElement>('#surface-home')?.checked ?? true,
      search: document.querySelector<HTMLInputElement>('#surface-search')?.checked ?? true,
      subscriptions: document.querySelector<HTMLInputElement>('#surface-subscriptions')?.checked ?? true
    },
    whitelist: {
      channels: DEFAULT_SETTINGS.whitelist.channels
    },
    stats: {
      hiddenVideoIds: DEFAULT_SETTINGS.stats.hiddenVideoIds,
      totalHiddenCount: DEFAULT_SETTINGS.stats.totalHiddenCount
    },
    appearance: {
      theme: DEFAULT_SETTINGS.appearance.theme
    }
  };
}

async function persistFromDom(document: Document, storage: StorageLike) {
  const existingSettings = await readSettings(storage);
  const domSettings = readCurrentSettings(document);
  const settings = {
    ...existingSettings,
    ...domSettings,
    surfaces: domSettings.surfaces
  };
  await writeSettings(storage, settings);
  return settings;
}

async function refreshPopup(document: Document, environment: PopupEnvironment) {
  const [settings, pageStats] = await Promise.all([readSettings(environment.storage), environment.getCurrentPageStats()]);
  applyThemePreference(document, environment.window ?? window, settings.appearance.theme);
  renderPopup(document, settings, pageStats.hiddenCount);
  bindEvents(document, environment);
}

function bindEvents(document: Document, environment: PopupEnvironment) {
  document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((input) => {
    input.addEventListener(
      'change',
      () => {
        void persistFromDom(document, environment.storage).then(async (settings) => {
          const pageStats = await environment.getCurrentPageStats();
          renderPopup(document, settings, pageStats.hiddenCount);
          bindEvents(document, environment);
        });
      },
      { once: true }
    );
  });

  document.querySelector<HTMLButtonElement>('#open-options')?.addEventListener(
    'click',
    () => {
      void environment.openOptionsPage();
    },
    { once: true }
  );
}

export async function initPopup(document: Document, environment: PopupEnvironment) {
  await refreshPopup(document, environment);
}
