import { hydrate, mount } from 'svelte';
import '@fontsource-variable/manrope';
import './style.css';
import App from './App.svelte';
const target = document.getElementById('app');
(target.hasChildNodes() ? hydrate : mount)(App,{target,props:{path:window.location.pathname}});
