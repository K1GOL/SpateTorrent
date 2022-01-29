const { ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
  // Add event listeners when page is loaded.
  //
  // Close window.
  document.getElementById('closeWindow').addEventListener('click', () => {
    ipcRenderer.send('closeFocusedWindow');
  });

  // OK button to confirm URI.
  document.getElementById('confirmURI').addEventListener('click', () => {
    ipcRenderer.send('confirmURI', document.getElementById('inputURI').value);
  });

  // Cancel button.
  document.getElementById('cancel').addEventListener('click', () => {
    ipcRenderer.send('closeFocusedWindow');
  });
});
