// @ts-nocheck

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { performance as nodePerformance } from 'node:perf_hooks';
import { JSDOM } from 'jsdom';

import { bootstrapYouTubeMembersFilter } from '@content/runtime';
import { hideMembersOnlyVideosForCards } from '@content/filter-members';
import { DEFAULT_SETTINGS, type ExtensionSettings } from '@shared/settings';

type BenchmarkResult = {
  name: string;
  averageMs: number;
  minMs: number;
  maxMs: number;
  iterations: number;
};

type SettingsOverrides = Partial<Omit<ExtensionSettings, 'surfaces' | 'whitelist' | 'stats' | 'appearance'>> & {
  surfaces?: Partial<ExtensionSettings['surfaces']>;
  whitelist?: Partial<ExtensionSettings['whitelist']>;
  stats?: Partial<ExtensionSettings['stats']>;
  appearance?: Partial<ExtensionSettings['appearance']>;
};

function readFixture(name: string) {
  return readFileSync(path.resolve(process.cwd(), 'tests/fixtures/content', name), 'utf8');
}

function createDom(url: string) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url
  });

  globalThis.window = dom.window as typeof globalThis.window;
  globalThis.document = dom.window.document;
  globalThis.history = dom.window.history;
  globalThis.MutationObserver = dom.window.MutationObserver;
  globalThis.Element = dom.window.Element;
  globalThis.Node = dom.window.Node;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.HTMLAnchorElement = dom.window.HTMLAnchorElement;
  globalThis.URL = dom.window.URL;
  globalThis.performance = nodePerformance;

  return dom;
}

function makeSettings(overrides: SettingsOverrides = {}): ExtensionSettings {
  return {
    enabled: overrides.enabled ?? DEFAULT_SETTINGS.enabled,
    surfaces: {
      ...DEFAULT_SETTINGS.surfaces,
      ...(overrides.surfaces ?? {})
    },
    whitelist: {
      ...DEFAULT_SETTINGS.whitelist,
      ...(overrides.whitelist ?? {})
    },
    stats: {
      ...DEFAULT_SETTINGS.stats,
      ...(overrides.stats ?? {})
    },
    appearance: {
      ...DEFAULT_SETTINGS.appearance,
      ...(overrides.appearance ?? {})
    }
  };
}

function createSettingsStore(initialSettings: ExtensionSettings = makeSettings()) {
  let settings = initialSettings;
  const listeners = new Set<() => void>();

  return {
    async read() {
      return settings;
    },
    async write(nextSettings: ExtensionSettings) {
      settings = nextSettings;
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}

function appendMembersOnlyCard(host: Element, index: number) {
  host.insertAdjacentHTML(
    'beforeend',
    `
      <ytd-rich-item-renderer id="members-card-${index}">
        <a href="/watch?v=members${String(index).padStart(6, '0')}">Video</a>
        <div id="details">
          <ytd-badge-supported-renderer>
            <span>Members only</span>
          </ytd-badge-supported-renderer>
        </div>
      </ytd-rich-item-renderer>
    `
  );
}

function createSyntheticGrid(cardCount: number, membersEvery = 3) {
  return `
    <div id="items">
      ${Array.from({ length: cardCount }, (_, index) => {
        const isMembersOnly = index % membersEvery === 0;
        return `
          <ytd-rich-item-renderer id="card-${index}">
            <a href="/watch?v=video${String(index).padStart(6, '0')}">Video</a>
            <a href="/@Channel${index % 17}">Channel</a>
            <div id="details">
              ${
                isMembersOnly
                  ? `
                    <ytd-badge-supported-renderer>
                      <span>Members only</span>
                    </ytd-badge-supported-renderer>
                  `
                  : ''
              }
            </div>
          </ytd-rich-item-renderer>
        `;
      }).join('')}
    </div>
  `;
}

async function flushTimersAndMutations() {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 65));
  await Promise.resolve();
}

async function measure(name: string, iterations: number, runCase: () => Promise<void>) {
  const samples: number[] = [];

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const dom = createDom('https://www.youtube.com/');
    globalThis.gc?.();

    const start = performance.now();
    await runCase();
    samples.push(performance.now() - start);
    dom.window.close();
  }

  const averageMs = samples.reduce((sum, sample) => sum + sample, 0) / samples.length;
  return {
    name,
    averageMs,
    minMs: Math.min(...samples),
    maxMs: Math.max(...samples),
    iterations
  } satisfies BenchmarkResult;
}

async function benchmarkInitialChannelScan() {
  history.replaceState({}, '', 'https://www.youtube.com/@demo/videos');
  document.body.innerHTML = `${readFixture('channel-videos-modern-grid.html')}${createSyntheticGrid(400)}`;

  const runtime = await bootstrapYouTubeMembersFilter(window, document, createSettingsStore());
  await flushTimersAndMutations();
  runtime.dispose();
}

async function benchmarkIncrementalMutationScan() {
  history.replaceState({}, '', 'https://www.youtube.com/');
  document.body.innerHTML = '<div id="items"></div>';

  const runtime = await bootstrapYouTubeMembersFilter(window, document, createSettingsStore());
  const host = document.querySelector('#items');
  if (!host) {
    throw new Error('expected #items host to exist');
  }

  for (let index = 0; index < 80; index += 1) {
    appendMembersOnlyCard(host, index);
  }

  await flushTimersAndMutations();
  runtime.dispose();
}

async function benchmarkUnrelatedMutationCost() {
  history.replaceState({}, '', 'https://www.youtube.com/');
  document.body.innerHTML = `${createSyntheticGrid(250)}<div id="unrelated-host"></div>`;

  const runtime = await bootstrapYouTubeMembersFilter(window, document, createSettingsStore());
  const unrelatedHost = document.querySelector('#unrelated-host');
  if (!unrelatedHost) {
    throw new Error('expected unrelated host to exist');
  }

  for (let index = 0; index < 100; index += 1) {
    const node = document.createElement('div');
    node.textContent = `note-${index}`;
    unrelatedHost.append(node);
  }

  await flushTimersAndMutations();
  runtime.dispose();
}

async function benchmarkCardFilteringMicro() {
  document.body.innerHTML = createSyntheticGrid(1000);
  const cards = Array.from(document.querySelectorAll('ytd-rich-item-renderer'));

  hideMembersOnlyVideosForCards(cards, 'home', {
    whitelistChannels: ['@channel1', '@channel4', '@channel7']
  });
}

async function main() {
  const results = [
    await measure('initial-channel-scan', 20, benchmarkInitialChannelScan),
    await measure('incremental-mutation-scan', 25, benchmarkIncrementalMutationScan),
    await measure('unrelated-mutation-cost', 25, benchmarkUnrelatedMutationCost),
    await measure('card-filtering-micro', 40, benchmarkCardFilteringMicro)
  ];

  console.log(JSON.stringify(results, null, 2));
}

void main();
