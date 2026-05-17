import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {mount, flushPromises} from '@vue/test-utils';
import ReportPanel from '../../src/components/ReportPanel.vue';
import store from '../../src/store.js';

describe('ReportPanel', () => {
  /** @type {import('@vue/test-utils').VueWrapper | null} */
  let wrapper = null;

  beforeEach(() => {
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
});
