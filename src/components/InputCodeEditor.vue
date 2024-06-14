<script setup>
import store from '../store';
import CodeEditor from './CodeEditor.vue';

const initialValue = `// This is the default code for flASTer
// Click the button at the top to load a file or paste directly into the editor
(function() {
  function createMessage() {return 'Hello' + ' ' + 'there!';}
  function print(msg) {console.log(msg)}
  print(createMessage());
})();`;

</script>

<template>
	<fieldset class="code-editor-wrapper">
		<legend>Your code <span v-if="store.isTransformed">(transformed)</span></legend>
		<code-editor :editor-id="store.editorIds.inputCodeEditor" :initial-value="initialValue"/>
	</fieldset>
</template>

<style scoped>
.code-editor-wrapper {
	flex: 1;
	min-width: 40vw;
	padding: 0;
	width: 100%;
	height: 50vh;
}

legend {
	font-size: larger;
}
</style>
