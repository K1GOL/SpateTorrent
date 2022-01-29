const { ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
  // Fill in details on page.
  ipcRenderer.on('showDetails', (event, message) => {
    document.getElementById('details').innerHTML = document.getElementById('details').innerHTML
      .replaceAll('$NAME', message.name)
      .replaceAll('$INFOHASH', message.infoHash)
      .replaceAll('$MAGNETURI', message.magnetURI)
      .replaceAll('$ANNOUNCE', message.announce)
      .replaceAll('$PIECELENGTH', message.pieceLength)
      .replaceAll('$LENGTH', message.length)
      .replaceAll('$NUMPEERS', message.numPeers)
      .replaceAll('$PATH', message.path);

    // Event listener to get .torrent file.
    document.getElementById('getTorrentFile-' + message.infoHash).addEventListener('click', () => {
      ipcRenderer.send('getTorrentFile', message.infoHash);
    });
  });

  // Close window button and ok button.
  document.getElementById('closeWindow').addEventListener('click', () => {
    ipcRenderer.send('closeFocusedWindow');
  });
});
