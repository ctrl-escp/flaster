<script setup>
import store from './store';
import {computed} from 'vue';
import IconGithub from './components/icons/IconGithub.vue';
import IconBandaid from './components/icons/IconBandaid.vue';
import FileLoader from './components/FileLoader.vue';
import ParseButton from './components/ParseButton.vue';

const topButtons = [
  FileLoader,
  ParseButton,
];

const isReadyToTransform = computed(() => store.areFiltersActive && store.filters.find(f => f?.enabled));
const isReadyToCompose = computed(() => false);
const nextAction = computed(() => isReadyToTransform.value ? isReadyToCompose.value ? 'compose' : 'transform' : 'filter');
</script>

<template>
    <nav>
			<span class="nav-left" title="flASTer">
        <icon-bandaid/>
				<span class="nav-title">fl<b>AST</b>er</span>
			</span>
      <div class="top-buttons">
        <span v-for="item of topButtons" :key="item" class="top-btn">
          <component :is="item"></component>
        </span>
        <button v-show="store.ast.length" class="btn top-btn btn-filter" :disabled="store.currentBottomPane === 'filter'" @click="store.changeViewTo('filter')">Filter</button>
        <button v-show="isReadyToTransform" class="btn btn-transform" :class="{active: nextAction === 'transform'}" @click="store.changeViewTo('transform')">Transform</button>
        <button v-show="isReadyToCompose" class="btn btn-compose" :class="{active: nextAction === 'compose'}" @click="store.changeViewTo('transform')">compose</button>
      </div>
      <span title="View code on GitHub">
				<a href="https://github.com/ctrl-escp/flaster" title="flASTer on GitHub">
					<span class="github-text">View on GitHub</span>
          <icon-github/>
				</a>
			</span>
    </nav>
</template>

<style scoped>
a {
  display: flex;
  align-items: center;
}
a:link {
  text-decoration: none;
}
.active {
  box-shadow: 0 0 .7rem .4rem rgba(255, 0, 0, 0.3);
}
.btn-transform {
  background-color: transparent;
  color: white;
}
.github-text {
  color: white;
  margin-right: 10px;
}
main {
  margin-top: .5rem;
}
nav {
  background-color: #212121;
  display: flex;
  align-items: center;
  border-radius: 10px;
  justify-content: space-between;
  height: var(--nav-height);
}
.nav-left {
  display: flex;
  align-items: center;
}
.nav-title {
  font-size: 2.4rem;
}
.top-btn {
  margin: 0 5px;
}
.top-buttons {
  display: flex;
  flex-direction: row;
}
</style>
