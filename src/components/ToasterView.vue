<script setup>
import {onMounted, reactive, ref} from 'vue';
import {store} from '../store.js';
import ToasterMessage from './ToasterMessage.vue';

const TOAST_TIMEOUT = 3.5 * 1000;

const toastQueue = reactive({});

function logMessage(text, level) {
	const key = level + text;
	if (!toastQueue[key]) {
		toastQueue[key] = {text, level};
		setTimeout(() => {
			const t = document.querySelector(`[data-key="${key}"]`);
			if (t) t.classList.add('toast-disappear');
			setTimeout(() => delete toastQueue[key], 1000);
		}, TOAST_TIMEOUT);

	}
	console.log(`[${level}] ${text}`);
}

onMounted(() => {
	store.logMessage = logMessage;
	window.store = store;   // DEBUG
});

</script>

<template>
	<div class="toaster">
		<div v-for="(toast, key) in toastQueue" :key="key">
			<toaster-message class="toast-appear" :text="toast.text" :level="toast.level" :data-key="key"/>
		</div>
	</div>
</template>

<style scoped>
.toast-appear {
	visibility: visible;
	-webkit-animation: fadein 0.5s;
	animation: fadein 0.5s;
	animation-fill-mode: forwards;
}

/*noinspection CssUnusedSymbol*/
.toast-disappear {
	-webkit-animation: fadeout 0.5s;
	animation: fadeout 0.5s;
	animation-fill-mode: forwards;
}

.toaster {
	justify-content: center;
	position: fixed;
	bottom: 30px;
}

toaster-message {
	visibility: hidden;
}

@-webkit-keyframes fadein {
	from {bottom: 0; opacity: 0;}
	to {bottom: 30px; opacity: 1;}
}
@keyframes fadein {
	from {bottom: 0; opacity: 0;}
	to {bottom: 30px; opacity: 1;}
}
@-webkit-keyframes fadeout {
	from {bottom: 30px; opacity: 1;}
	to {bottom: 0; opacity: 0;}
}
@keyframes fadeout {
	from {bottom: 30px; opacity: 1;}
	to {bottom: 0; opacity: 0;}
}
</style>
