import { DEFAULT_SETTINGS, type ExtensionSettings, readSettings, writeSettings } from '@shared/settings';

type StorageLike = {
  get: (key: string) => Promise<Record<string, unknown>>;
  set: (value: Record<string, unknown>) => Promise<void>;
};

const SURFACE_FIELDS: Array<{ key: keyof ExtensionSettings['surfaces']; label: string; hint: string }> = [
  { key: 'channel', label: 'Paginas de canal', hint: 'Oculta videos para miembros en paginas de canal.' },
  { key: 'recommendations', label: 'Recomendaciones', hint: 'Oculta videos para miembros en recomendaciones y relacionados.' },
  { key: 'home', label: 'Inicio', hint: 'Oculta videos para miembros en la pagina principal.' },
  { key: 'search', label: 'Busqueda', hint: 'Oculta videos para miembros en resultados de busqueda.' },
  { key: 'subscriptions', label: 'Suscripciones', hint: 'Oculta videos para miembros en el feed de suscripciones.' }
];

function renderToggleRow(id: string, label: string, checked: boolean, disabled: boolean, hint: string, child = false) {
  return `
    <label class="toggle-row${child ? ' toggle-row-child' : ''}${disabled ? ' is-disabled' : ''}" title="${hint}">
      <span class="toggle-copy">
        <span class="toggle-label">${label}</span>
        <span class="toggle-hint">${hint}</span>
      </span>
      <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''} />
    </label>
  `;
}

function renderPopup(document: Document, settings: ExtensionSettings) {
  const form = document.querySelector('#popup-form');
  if (!(form instanceof HTMLFormElement)) {
    throw new Error('popup form host not found');
  }

  const childrenMarkup = SURFACE_FIELDS.map((surface) =>
    renderToggleRow(
      `surface-${surface.key}`,
      surface.label,
      settings.surfaces[surface.key],
      !settings.enabled,
      surface.hint,
      true
    )
  ).join('');

  form.innerHTML = `
    <section class="panel">
      <h1>Filtro de miembros</h1>
      <p class="panel-subtitle">Activa o desactiva el filtro para YouTube.</p>
      ${renderToggleRow('setting-enabled', 'Filtro global', settings.enabled, false, 'Activa o desactiva toda la extension.')}
    </section>
    <section class="panel">
      <h2>Superficies</h2>
      ${childrenMarkup}
    </section>
    <p class="instant-note">Los cambios se aplican al instante.</p>
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
    }
  };
}

async function persistFromDom(document: Document, storage: StorageLike) {
  const settings = readCurrentSettings(document);
  await writeSettings(storage, settings);
  renderPopup(document, settings);
  bindEvents(document, storage);
}

function bindEvents(document: Document, storage: StorageLike) {
  document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((input) => {
    input.addEventListener(
      'change',
      () => {
        void persistFromDom(document, storage);
      },
      { once: true }
    );
  });
}

export async function initPopup(document: Document, storage: StorageLike) {
  const settings = await readSettings(storage);
  renderPopup(document, settings);
  bindEvents(document, storage);
}
