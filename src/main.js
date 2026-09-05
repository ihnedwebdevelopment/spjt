import { hydrate, mount } from 'svelte';
import '@fontsource-variable/manrope';
import '@fontsource/cormorant-garamond/latin-ext-500-italic.css';
import '@fontsource/cormorant-garamond/latin-500-italic.css';
import './style.css';
import App from './App.svelte';
const target = document.getElementById('app');
(target.hasChildNodes() ? hydrate : mount)(App,{target,props:{path:window.location.pathname}});
