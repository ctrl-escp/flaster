import {describe, it, expect} from 'vitest';
import {mount, flushPromises} from '@vue/test-utils';
import HelpOverlay from '../../src/components/HelpOverlay.vue';

describe('HelpOverlay', () => {
  it('exposes dialog semantics for screen readers', () => {
    const wrapper = mount(HelpOverlay, {attachTo: document.body});
    const dialog = wrapper.find('[role="dialog"]');
    expect(dialog.exists()).toBe(true);
    expect(dialog.attributes('aria-modal')).toBe('true');
    expect(dialog.attributes('aria-labelledby')).toBe('help-title');
    wrapper.unmount();
  });

  it('renders Feature Detection with a coming-soon badge', () => {
    const wrapper = mount(HelpOverlay, {attachTo: document.body});
    expect(wrapper.text()).toMatch(/Feature Detection/);
    expect(wrapper.findAll('.coming-soon').length).toBeGreaterThanOrEqual(1);
    wrapper.unmount();
  });

  it('emits close when the backdrop receives a direct click', async () => {
    const wrapper = mount(HelpOverlay, {attachTo: document.body});
    const backdrop = wrapper.get('.help-backdrop').element;
    backdrop.dispatchEvent(new MouseEvent('click', {bubbles: true}));
    await flushPromises();
    expect(wrapper.emitted('close')).toEqual([[]]);
    wrapper.unmount();
  });

  it('documents Escape for closing in the shortcuts table', () => {
    const wrapper = mount(HelpOverlay, {attachTo: document.body});
    const shortcutKeys = wrapper.findAll('.shortcuts-table tbody th[scope="row"]').map((cell) => cell.text());
    expect(shortcutKeys.some((label) => /Escape/i.test(label))).toBe(true);
    expect(wrapper.text()).toMatch(/Close this help screen/);
    wrapper.unmount();
  });

  it('documents local workspace persistence', () => {
    const wrapper = mount(HelpOverlay, {attachTo: document.body});
    expect(wrapper.text()).toMatch(/Saved workspace/);
    expect(wrapper.text()).toMatch(/Automatic restore point/);
    expect(wrapper.text()).toMatch(/Clear saved data/);
    wrapper.unmount();
  });

  it('emits close when the header close button is activated', async () => {
    const wrapper = mount(HelpOverlay, {attachTo: document.body});
    await wrapper.get('button[aria-label="Close help"]').trigger('click');
    expect(wrapper.emitted('close')).toEqual([[]]);
    wrapper.unmount();
  });

  it('moves focus to the close button after mount', async () => {
    const wrapper = mount(HelpOverlay, {attachTo: document.body});
    await flushPromises();
    const closeBtn = wrapper.get('button[aria-label="Close help"]').element;
    expect(document.activeElement).toBe(closeBtn);
    wrapper.unmount();
  });
});
