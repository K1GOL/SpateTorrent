const { ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
  // Add event listeners when page is loaded.
  //
  // Close window.
  document.getElementById('closeWindow').addEventListener('click', () => {
    ipcRenderer.send('closeFocusedWindow');
  });

  // Select path input box
  document.getElementById('pathToSeed').addEventListener('click', () => {
    // Assign text box value to return value of ipc, which will be
    // the path selected by the user for seeding.
    document.getElementById('pathToSeed').value = ipcRenderer.sendSync('selectPathToSeed', 'file');
  });

  // Select file button
  document.getElementById('selectFile').addEventListener('click', () => {
    // Assign text box value to return value of ipc, which will be
    // the path selected by the user for seeding.
    document.getElementById('pathToSeed').value = ipcRenderer.sendSync('selectPathToSeed', 'file');
  });

  // Select folder button
  document.getElementById('selectFolder').addEventListener('click', () => {
    // Assign text box value to return value of ipc, which will be
    // the path selected by the user for seeding.
    document.getElementById('pathToSeed').value = ipcRenderer.sendSync('selectPathToSeed', 'dir');
  });

  // OK button to confirm seeding.
  document.getElementById('startSeeding').addEventListener('click', () => {
    const opts = {
      path: document.getElementById('pathToSeed').value,
      name: document.getElementById('torrentName').value,
      private: document.getElementById('seedPrivately').checked
    };
    // Split custom trackers to array before sending.
    const customTrackers = document.getElementById('customTrackers').value.replaceAll(' ', '').split(';');
    // Filter out empty list.
    if (customTrackers[0] !== '') opts.customTrackers = customTrackers;
    ipcRenderer.send('startSeeding', opts);
    ipcRenderer.send('closeFocusedWindow');
  });

  // Cancel button.
  document.getElementById('cancel').addEventListener('click', () => {
    ipcRenderer.send('closeFocusedWindow');
  });
});
