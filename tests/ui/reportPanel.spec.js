import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {mount, flushPromises} from '@vue/test-utils';
import ReportPanel from '../../src/components/ReportPanel.vue';
import store from '../../src/store.js';

describe('ReportPanel', () => {
  /** @type {import('@vue/test-utils').VueWrapper | null} */
  let wrapper = null;

  beforeEach(() => {
    store.parseRunSequence = 1;
    store.arb = {ast: [{nodeId: 'n1', type: 'Literal', value: 1}], script: '1'};
    store.apiSurfaceStatus = 'done';
    store.knownStructureExecutionStatus = {state: 'idle'};
    store.capabilities = [];
    store.apiDetectorHits = {};
    store.availableKnownStructures = [{
      id: 'proxy-vars',
      title: 'Proxy Variables',
      category: 'proxying',
      categoryGroup: 'obfuscation',
    }];
    store.knownStructureMatchesById = {
      'proxy-vars': [{
        structureId: 'proxy-vars',
        metadata: {matchOrdinal: 0},
        relevantNode: {nodeId: 1},
      }],
    };
    store.knownStructureMatchCounts = {'proxy-vars': 1};
    store.selectedKnownStructureIds = [];
    store.selectedKnownStructureMatch = null;
    store.knownStructureSelectionById = {};
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
  });

  it('lists obfuscation findings with match navigation', async () => {
    wrapper = mount(ReportPanel);

    expect(wrapper.text()).toContain('Proxy Variables');
    expect(wrapper.text()).toContain('Obfuscation');
    expect(wrapper.find('.finding-match-nav').exists()).toBe(true);

    await wrapper.get('button[aria-label="Next match"]').trigger('click');
    await flushPromises();

    expect(store.selectedKnownStructureMatch).toEqual({
      structureId: 'proxy-vars',
      index: 0,
    });
  });

  it('hides obfuscation findings when the obfuscation filter is off', async () => {
    wrapper = mount(ReportPanel);

    await wrapper.get('[aria-label="Report filters"]').findAll('button')[0].trigger('click');
    await flushPromises();

    expect(wrapper.text()).not.toContain('Proxy Variables');
    expect(wrapper.text()).toContain('Enable Obfuscation or API Surface');
  });

  it('shows API surface capabilities and detectors when that filter is on', async () => {
    store.capabilities = [{
      id: 'devtools-size-probe',
      title: 'DevTools Size Probe',
      description: 'Probe',
      risk: 'benign',
      riskReason: 'Benign',
      firedDetectorIds: ['window-inner-width'],
    }];
    store.apiDetectorHits = {
      'window-inner-width': [{extractions: {value: {values: ['640']}}}],
    };
    store.availableKnownStructures = [
      ...store.availableKnownStructures,
      {
        id: 'window-inner-width',
        title: 'window.innerWidth',
        category: 'window-geometry',
        categoryGroup: 'api-surface',
      },
    ];
    store.knownStructureMatchesById = {
      ...store.knownStructureMatchesById,
      'window-inner-width': [{
        structureId: 'window-inner-width',
        metadata: {matchOrdinal: 0},
        relevantNode: {nodeId: 2},
      }],
    };

    wrapper = mount(ReportPanel);

    expect(wrapper.text()).toContain('DevTools Size Probe');
    expect(wrapper.text()).toContain('window.innerWidth');

    const filterButtons = wrapper.get('[aria-label="Report filters"]').findAll('button');
    await filterButtons[0].trigger('click');
    await flushPromises();

    expect(wrapper.text()).not.toContain('Proxy Variables');
    expect(wrapper.text()).toContain('DevTools Size Probe');
  });
});
