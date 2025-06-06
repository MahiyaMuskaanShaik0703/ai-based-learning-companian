import React from 'react';
import ReactDOM from 'react-dom/client'; // For React 18+
import './index.css';
import App from './App'; // Import the App component

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);