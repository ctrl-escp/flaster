/**
 * CodeMirror host surface: editor registry and bottom-pane chrome.
 * @returns {Record<string, unknown>}
 */
export function createShellSection() {
  return {
    currentBottomPane: 'filter',
    changeViewTo(bottomPaneName) {
      this.currentBottomPane = bottomPaneName;
    },
    editors: [],
    editorIds: {
      inputCodeEditor: 'inputCodeEditor',
      filterEditor: 'filterEditor',
      transformEditor: 'transformEditor',
      composerEditor: 'composerEditor',
    },
    getEditor(editorId) {
      return this.editors.find((e) => e.editorId === editorId);
    },
    setContent(editor, content) {
      editor.dispatch({
        changes: [
          {from: 0, to: editor.state.doc.length},
          {from: 0, insert: content},
        ],
      });
    },
  };
}
