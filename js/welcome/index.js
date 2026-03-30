import '../../css/welcome.css';
import { WelcomeApp } from './WelcomeApp.js';

const canvas = document.getElementById('welcome-canvas');
const app = new WelcomeApp(canvas);
app.init();
app.start();
