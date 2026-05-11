import {
  foldAll,
  foldCode,
  foldEffect,
  foldable,
  foldedRanges,
  unfoldAll,
  unfoldCode,
  unfoldEffect,
} from '@codemirror/language';

function foldableContainer(view, line) {
  for (let cursorLine = line;;) {
    const range = foldable(view.state, cursorLine.from, cursorLine.to);
    if (range && range.to > line.from) {
      return range;
    }
    if (!cursorLine.from) {
      return null;
    }
    cursorLine = view.state.doc.lineAt(cursorLine.from - 1);
  }
}

function foldedRangeOnLine(state, line) {
  let found = null;
  foldedRanges(state).between(line.from, line.to, (from, to) => {
    if (!found || from < found.from) {
      found = {from, to};
    }
  });
  return found;
}

function currentFoldRanges(view) {
  const ranges = [];
  for (const {head} of view.state.selection.ranges) {
    const line = view.state.doc.lineAt(head);
    const range = foldedRangeOnLine(view.state, line) || foldableContainer(view, line);
    if (range && !ranges.some((existing) => existing.from === range.from && existing.to === range.to)) {
      ranges.push(range);
    }
  }
  return ranges;
}

function isFolded(state, range) {
  let folded = false;
  foldedRanges(state).between(range.from, range.from, (from, to) => {
    folded ||= from === range.from && to === range.to;
  });
  return folded;
}

function foldableRangesInside(view, container) {
  const ranges = [];
  for (let pos = view.state.doc.lineAt(container.from).from; pos <= container.to;) {
    const line = view.state.doc.lineAt(pos);
    const range = foldable(view.state, line.from, line.to);
    if (
      range &&
      range.from >= container.from &&
      range.to <= container.to &&
      !isFolded(view.state, range) &&
      !ranges.some((existing) => existing.from === range.from && existing.to === range.to)
    ) {
      ranges.push(range);
    }
    pos = line.to + 1;
  }
  return ranges;
}

export function foldCurrentRecursively(view) {
  const effects = currentFoldRanges(view)
    .flatMap((range) => foldableRangesInside(view, range))
    .map((range) => foldEffect.of(range));

  if (!effects.length) {
    return false;
  }
  view.dispatch({effects});
  return true;
}

export function unfoldCurrentRecursively(view) {
  const effects = [];
  for (const container of currentFoldRanges(view)) {
    foldedRanges(view.state).between(container.from, container.to, (from, to) => {
      if (from >= container.from && to <= container.to) {
        effects.push(unfoldEffect.of({from, to}));
      }
    });
  }

  if (!effects.length) {
    return false;
  }
  view.dispatch({effects});
  return true;
}

export const foldingKeymap = [
  {key: 'Ctrl-Shift-[', mac: 'Cmd-Alt-[', run: foldCode},
  {key: 'Ctrl-Shift-]', mac: 'Cmd-Alt-]', run: unfoldCode},
  {key: 'Ctrl-Alt-Shift-[', mac: 'Cmd-Alt-Shift-[', run: foldCurrentRecursively},
  {key: 'Ctrl-Alt-Shift-]', mac: 'Cmd-Alt-Shift-]', run: unfoldCurrentRecursively},
  {key: 'Ctrl-Alt-[', run: foldAll},
  {key: 'Ctrl-Alt-]', run: unfoldAll},
];
