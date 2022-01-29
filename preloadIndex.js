const { ipcRenderer } = require('electron');
const fs = require('fs');

// Load HTML elements.
const listItemElement = fs.readFileSync('./html/listItem.html', 'utf8');

window.addEventListener('DOMContentLoaded', () => {
  // Add event listeners when page is loaded.
  //
  // Close window.
  document.getElementById('closeWindow').addEventListener('click', () => {
    ipcRenderer.send('closeFocusedWindow');
  });

  // Minimize window.
  document.getElementById('minimizeWindow').addEventListener('click', () => {
    ipcRenderer.send('minimizeFocusedWindow');
  });

  // Maximize window.
  document.getElementById('maximizeWindow').addEventListener('click', () => {
    ipcRenderer.send('maximizeFocusedWindow');
  });

  // Add URI button.
  document.getElementById('addURI').addEventListener('click', () => {
    ipcRenderer.send('addURI');
  });

  // Add file button.
  document.getElementById('addFile').addEventListener('click', () => {
    ipcRenderer.send('addFile');
  });

  // Seed files button
  document.getElementById('seedFiles').addEventListener('click', () => {
    ipcRenderer.send('seedFiles');
  });

  // When torrent list UI needs to be updated.
  ipcRenderer.on('updateTorrentList', (event, message) => {
    // HTML that will be appended.
    // console.log(listItemElement);
    let html = '';
    message.forEach(item => {
      // Make list item element for item.
      let element = listItemElement;
      element = element.replaceAll('$NAME', item.name);
      element = element.replaceAll('$UPSPEED', (item.uploadSpeed / 1000000).toFixed(3));
      element = element.replaceAll('$DOWNSPEED', (item.downloadSpeed / 1000000).toFixed(3));
      element = element.replaceAll('$INFOHASH', item.infoHash);
      // Handle days in remaining time estimate.
      let tr = item.timeRemaining;
      let d = 0;
      while (tr > 86400000) {
        d++;
        tr -= 86400000;
      }
      if (d > 0) {
        element = element.replaceAll('$TIMELEFT', d + ' days, ' + new Date(item.timeRemaining).toISOString().substr(11, 8));
      } else {
        element = element.replaceAll('$TIMELEFT', new Date(item.timeRemaining).toISOString().substr(11, 8));
      }
      // Pause button.
      if (item.paused) element = element.replaceAll('$STATUS', 'Resume');
      else element = element.replaceAll('$STATUS', 'Pause');
      // Progress.
      if (item.length >= 1e9) element = element.replaceAll('$DOWNLOADED', `${(item.downloaded / 1e9).toFixed(2)} / ${(item.length / 1e9).toFixed(2)} GB`);
      element = element.replaceAll('$DOWNLOADED', `${(item.downloaded / 1e6).toFixed(2)} / ${(item.length / 1e6).toFixed(2)} MB`);

      // Append.
      html += element;
    });
    document.getElementById('listView').innerHTML = html;

    // Add event listeners.
    message.forEach(item => {
      document.getElementById('remove-' + item.infoHash).addEventListener('click', () => {
        ipcRenderer.send('removeTorrent', item.infoHash);
      });
      /* document.getElementById(`pauseResume-${item.infoHash}`).addEventListener('click', () => {
        ipcRenderer.send('pauseResume', item.infoHash);
      }); */
      document.getElementById(`details-${item.infoHash}`).addEventListener('click', () => {
        ipcRenderer.send('details', item.infoHash);
      });
      document.getElementById(`folder-${item.infoHash}`).addEventListener('click', () => {
        ipcRenderer.send('folder', item.infoHash);
      });
    });
  });
});
