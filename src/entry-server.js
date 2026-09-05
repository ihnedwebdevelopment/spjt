import { render } from 'svelte/server';
import App from './App.svelte';
export function prerender(path){return render(App,{props:{path}});}
