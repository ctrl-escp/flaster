import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {mount, flushPromises} from '@vue/test-utils';
import CodeStructuresStage from '../../src/components/CodeStructuresStage.vue';
import store from '../../src/store.js';

describe('CodeStructuresStage', () => {
  /** @type {import('@vue/test-utils').VueWrapper | null} */
  let wrapper = null;

  beforeEach(() => {
    store.activeWorkspaceTab = 'explorer';
    store.arb = {ast: [{nodeId: 'n1', type: 'Literal', value: 1}], script: '1'};
    store.filteredNodes = store.arb.ast;
    store.areFiltersActive = true;
    store.availableKnownStructures = store.availableKnownStructures?.length
      ? store.availableKnownStructures
      : [{
        id: 'sample-structure',
        title: 'Sample',
        category: 'test',
        categoryGroup: 'test',
        executionMode: 'no-eval',
      }];
    store.knownStructureMatchCounts = {};
    store.selectedKnownStructureIds = [];
    store.apiSurfaceStatus = 'idle';
    store.capabilities = [];
    store.apiDetectorHits = {};
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
  });

  it('keeps Code Structures explorer filters when switching subtabs', async () => {
    wrapper = mount(CodeStructuresStage, {attachTo: document.body});

    const searchInput = wrapper.get('input[type="search"]');
    await searchInput.setValue('persist-me');

    await wrapper.get('button[title="API Surface"]').trigger('click');
    await flushPromises();

    await wrapper.get('button[title="Code Structures"]').trigger('click');
    await flushPromises();

    expect(wrapper.get('input[type="search"]').element.value).toBe('persist-me');
  });
});
