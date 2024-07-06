<script setup>
import store from './store';
import {computed} from 'vue';
import IconGithub from './components/icons/IconGithub.vue';
import IconBandaid from './components/icons/IconBandaid.vue';
import FileLoader from './components/FileLoader.vue';
import ParseButton from './components/ParseButton.vue';
import IconFilter from './components/icons/IconFilter.vue';
import IconTransform from './components/icons/IconTransform.vue';
import IconCompose from './components/icons/IconCompose.vue';

const topButtons = [
  {
    title: 'Load a file',
    component: FileLoader,
  },
  {
    title: 'Parse the script into nodes',
    component: ParseButton,
  },
];

// noinspection JSUnresolvedReference
const isReadyToTransform = computed(() => !!store.arb?.ast?.length && store.areFiltersActive && store.filters.find(f => f?.enabled));
const isReadyToCompose = computed(() => store.states.length);
</script>

<template>
    <nav>
			<span class="nav-left" title="flASTer">
        <icon-bandaid/>
				<span class="nav-title">fl<b>AST</b>er</span>
			</span>
      <div class="top-buttons">
        <component v-for="item of topButtons" :key="item" class="top-btn" :title="item.title" :is="item.component"/>
        <span class="top-btn" title="Create a filter" @click="store.changeViewTo('filter')"
          :class="{active: store.currentBottomPane === 'filter' && store.arb?.ast?.length, disabled: !store.arb?.ast?.length || store.currentBottomPane === 'filter'}">
          <icon-filter />
          <span class="top-btn-text">Filter</span>
        </span>
        <span class="top-btn" :class="{active: store.currentBottomPane === 'transform', disabled: !isReadyToTransform}"
              @click="store.changeViewTo('transform')" title="Transform the code">
          <icon-transform/>
          <span class="top-btn-text">Transform</span>
        </span>
        <span class="top-btn" :class="{active: store.currentBottomPane === 'compose', disabled: !isReadyToCompose}"
              @click="store.changeViewTo('compose')" title="Compose a script">
          <icon-compose/>
          <span class="top-btn-text">Compose</span>
        </span>
      </div>
      <span title="View code on GitHub">
				<a href="https://github.com/ctrl-escp/flaster" title="flASTer on GitHub" target="_blank">
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
  filter: brightness(200%);
  --off-white: rgba(255, 255, 255, .2);
  text-shadow: 2px 2px 4px var(--off-white), -2px -2px 4px white, 2px -2px 4px var(--off-white), -2px 2px 4px var(--off-white);
}
.disabled {
  transform: none;
  cursor: not-allowed;
  filter: brightness(50%);
  &.active {
    filter: brightness(100%);
  }
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
  gap: 1rem;
}
.nav-left {
  display: flex;
  align-items: center;
}
.nav-title {
  font-size: 2.4rem;
}
.top-btn {
  border: none;
  cursor: pointer;
  width: 3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  transition: width .2s ease;
  > svg {
    height: 2rem;
  }
  &.disabled {
    cursor: not-allowed;
  }
  @media (max-width: 700px) {
    width: 2rem;
  }
}
.top-btn-text {
  font-size: 1rem;
  @media (max-width: 700px) {
    display: none;
  }
}
.top-buttons {
  display: flex;
  flex-direction: row;
  gap: 3rem;
  align-items: center;
  transition: gap .5s ease;
  @media (max-width: 700px) {
    gap: 1.5rem;
  }
  @media (max-width: 550px) {
    gap: 1rem;
  }
}
</style>
