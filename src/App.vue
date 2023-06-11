<script setup>
import IconBandaid from './components/icons/IconBandaid.vue';
import IconGithub from './components/icons/IconGithub.vue';
import InputCodeEditor from './components/InputCodeEditor.vue';
import FileLoader from './components/FileLoader.vue';
import ParseButton from './components/ParseButton.vue';
import NodesList from './components/NodesList.vue';
import FilterEditor from './components/FilterEditor.vue';

const navItems = [
	FileLoader,
	ParseButton,
];
</script>

<template>
	<header>
		<nav>
			<span class="nav-left">
				<a href="#">
          <icon-bandaid/>
				</a>
				<span class="nav-title">fl<b>AST</b>er</span>
			</span>
			<span class="nav-items">
        <span v-for="navItem of navItems" :key="navItem" class="nav-items">
          <span class="nav-sep">|</span>
          <component :is="navItem"></component>
        </span>
        <span class="nav-sep">|</span>
      </span>
			<span title="View code on GitHub">
				<a class="mr-5" href="https://github.com/ctrl-escp/flaster" title="flASTer">
					<span class="github-text">View on GitHub</span>
          <icon-github/>
				</a>
			</span>
		</nav>
	</header>
	<div class="panes">
		<div class="pane-upper">
			<input-code-editor/>
			<nodes-list/>
		</div>
		<div class="pane-lower">
			<filter-editor/>
		</div>
	</div>
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

nav {
	background-color: #212121;
	display: flex;
	align-items: center;
	border-radius: 10px;
	justify-content: space-between;
	height: var(--nav-height);
}

.nav-items {
	display: flex;
	flex-direction: row;
}

.nav-left {
	display: flex;
	align-items: center;
}

.nav-sep {
	margin: 0 5px;
}

.nav-title {
	font-size: 2.4rem;
}

.pane-lower {
	flex: 1;
	display: flex;
}

.pane-upper {
	flex: 1;
	display: flex;
	margin-bottom: 5px;
}

.panes {
	display: flex;
	flex-direction: column;
	height: calc(95vh - var(--nav-height));
}
</style>
