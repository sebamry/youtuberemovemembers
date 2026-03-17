import { normalizeChannelInput, readSettings, writeSettings, type ExtensionSettings, type ThemePreference } from '@shared/settings';
import { applyThemePreference } from '@shared/theme';

type StorageLike = {
  get: (key: string) => Promise<Record<string, unknown>>;
  set: (value: Record<string, unknown>) => Promise<void>;
};

type OptionsEnvironment = {
  storage: StorageLike;
  window?: Window;
};

const THEME_OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' }
];

function renderWhitelistItems(settings: ExtensionSettings) {
  if (settings.whitelist.channels.length === 0) {
    return '<p class="empty-state">Todavia no hay canales permitidos.</p>';
  }

  return `
    <ul class="channel-list">
      ${settings.whitelist.channels
        .map(
          (channel) => `
            <li class="channel-row">
              <span class="channel-pill">${channel}</span>
              <button type="button" class="remove-channel" data-channel="${channel}">Eliminar</button>
            </li>
          `
        )
        .join('')}
    </ul>
  `;
}

function renderOptions(document: Document, settings: ExtensionSettings) {
  const root = document.querySelector('#options-root');
  if (!(root instanceof HTMLElement)) {
    throw new Error('options root not found');
  }

  root.innerHTML = `
    <section class="options-shell">
      <header class="options-header">
        <h1>Ajustes</h1>
        <p>Controla los canales permitidos, la apariencia y el historial del filtro.</p>
      </header>
      <section class="options-card">
        <h2>Apariencia</h2>
        <div class="theme-segment" role="tablist" aria-label="Tema">
          ${THEME_OPTIONS.map(
            (option) => `
              <button
                type="button"
                class="theme-option${settings.appearance.theme === option.value ? ' is-selected' : ''}"
                data-theme-value="${option.value}"
              >
                ${option.label}
              </button>
            `
          ).join('')}
        </div>
      </section>
      <section class="options-card">
        <h2>Whitelist de canales</h2>
        <p class="card-note">Los canales permitidos no se ocultan en ninguna superficie.</p>
        <div class="channel-form">
          <input id="channel-input" type="text" placeholder="@canal, URL o channel ID" />
          <button type="button" id="add-channel">Agregar</button>
        </div>
        ${renderWhitelistItems(settings)}
      </section>
      <section class="options-card">
        <h2>Estadisticas</h2>
        <p class="card-note">El total se mantiene aunque cierres Chrome.</p>
        <div class="stat-row">
          <span>Total historico ocultado</span>
          <strong>${settings.stats.hiddenVideoIds.length}</strong>
        </div>
        <button type="button" id="reset-total" class="secondary-button">Resetear total</button>
      </section>
    </section>
  `;
}

async function refresh(document: Document, environment: OptionsEnvironment) {
  const settings = await readSettings(environment.storage);
  applyThemePreference(document, environment.window ?? window, settings.appearance.theme);
  renderOptions(document, settings);
  bindEvents(document, environment, settings);
}

function bindEvents(document: Document, environment: OptionsEnvironment, settings: ExtensionSettings) {
  document.querySelector<HTMLButtonElement>('#add-channel')?.addEventListener(
    'click',
    () => {
      const input = document.querySelector<HTMLInputElement>('#channel-input');
      const normalizedChannel = normalizeChannelInput(input?.value ?? '');
      if (!normalizedChannel) {
        return;
      }

      const nextSettings: ExtensionSettings = {
        ...settings,
        whitelist: {
          channels: Array.from(new Set([...settings.whitelist.channels, normalizedChannel]))
        }
      };

      void writeSettings(environment.storage, nextSettings).then(() => refresh(document, environment));
    },
    { once: true }
  );

  document.querySelectorAll<HTMLButtonElement>('[data-theme-value]').forEach((button) => {
    button.addEventListener(
      'click',
      () => {
        const nextTheme = button.dataset.themeValue as ThemePreference | undefined;
        if (!nextTheme) {
          return;
        }

        const nextSettings: ExtensionSettings = {
          ...settings,
          appearance: {
            theme: nextTheme
          }
        };

        void writeSettings(environment.storage, nextSettings).then(() => refresh(document, environment));
      },
      { once: true }
    );
  });

  document.querySelectorAll<HTMLButtonElement>('.remove-channel').forEach((button) => {
    button.addEventListener(
      'click',
      () => {
        const channelToRemove = button.dataset.channel;
        const nextSettings: ExtensionSettings = {
          ...settings,
          whitelist: {
            channels: settings.whitelist.channels.filter((channel) => channel !== channelToRemove)
          }
        };

        void writeSettings(environment.storage, nextSettings).then(() => refresh(document, environment));
      },
      { once: true }
    );
  });

  document.querySelector<HTMLButtonElement>('#reset-total')?.addEventListener(
    'click',
    () => {
      const nextSettings: ExtensionSettings = {
        ...settings,
        stats: {
          hiddenVideoIds: []
        }
      };

      void writeSettings(environment.storage, nextSettings).then(() => refresh(document, environment));
    },
    { once: true }
  );
}

export async function initOptionsPage(document: Document, environment: OptionsEnvironment) {
  await refresh(document, environment);
}
