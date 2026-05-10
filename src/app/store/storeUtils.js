export function cloneValue(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

export function normalizeScriptLabel(label, fallback = 'Custom script') {
  return typeof label === 'string' && label.trim().length
    ? label.trim()
    : fallback;
}

export function areStringArraysEqual(left = [], right = []) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

export function debounce(fn, ms) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/**
 * @param {string[]} filtersArr
 * @returns {string}
 */
export function combineFilterSources(filtersArr) {
  let filterSrc = `(${filtersArr[0]})\n`;
  for (const filter of filtersArr.slice(1)) {
    filterSrc += ` && (${filter})\n`;
  }
  return filterSrc;
}
