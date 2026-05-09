import {describe, expect, it} from 'vitest';
import {mount} from '@vue/test-utils';
import IconHelp from '../../src/components/icons/IconHelp.vue';

describe('IconHelp', () => {
  it('renders a single path-filled svg for header sizing', () => {
    const wrapper = mount(IconHelp);

    const svg = wrapper.find('svg');
    expect(svg.attributes('viewBox')).toBe('0 0 24 24');
    expect(svg.attributes('aria-hidden')).toBe('true');

    const path = svg.find('path');
    expect(path.exists()).toBe(true);
    expect(path.attributes('fill')).toBe('currentColor');
  });
});
