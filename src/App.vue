<script setup>
import store from './store';
import {computed} from 'vue';
import ToasterView from './components/ToasterView.vue';
import ExplorationTab from './tabs/ExplorationTab.vue';
import IconGithub from './components/icons/IconGithub.vue';
import IconBandaid from './components/icons/IconBandaid.vue';
// import TransformationTab from './tabs/TransformationTab.vue';

const tabs = {
  explore: ExplorationTab,
  // transform: TransformationTab,
};

const availableTabs = computed(() => Object.keys(tabs));

</script>

<template>
  <header>
    <nav>
			<span class="nav-left">
        <icon-bandaid/>
				<span class="nav-title">fl<b>AST</b>er</span>
			</span>
<!--      <span class="tabs">-->
<!--        <button class="btn tab-btn" v-for="tabName in availableTabs" :key="tabName" @click="store.currentTab = tabName">{{tabName}}</button>-->
<!--      </span>-->
      <span title="View code on GitHub">
				<a href="https://github.com/ctrl-escp/flaster" title="flASTer on GitHub">
					<span class="github-text">View on GitHub</span>
          <icon-github/>
				</a>
			</span>
    </nav>
  </header>
  <main>
    <keep-alive>
      <component :is="tabs[store.currentTab]"/>
    </keep-alive>
  </main>
  <toaster-view/>
</template>

<style scoped>
a {
  display: flex;
  align-items: center;
}

a:link {
  text-decoration: none;
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

.tab-btn {
  text-transform: capitalize;

}

.tabs {
  display: flex;
  gap: 1rem;
}
</style>
