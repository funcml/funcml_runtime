import './style.css';

import { Component } from './generated/component';

const appRoot = document.getElementById('app');

if (appRoot) {
  const myApp = Component();
  appRoot.appendChild(myApp);
}