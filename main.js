// Modules to control application life and create native browser window
const { app, ipcMain, dialog, BrowserWindow } = require('electron');
const path = require('path');
const WebTorrent = require('webtorrent');
const fs = require('fs');
const childProcess = require('child_process');
const info = require('./package.json');

const client = new WebTorrent();
// This string will be set as the 'createdBy' option for any created torrents.
const creatorString = `Spate ${info.version}`;
// Store main window.
let mainWindow;
// Store path to data directory.
const dataDir = path.join(app.getPath('userData'), 'Spate');
// Store added torrents;
const torrents = [];

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preloadIndex.js')
    }
  });

  // and load the index.html of the app.
  mainWindow.loadFile('./html/index.html');

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // Load existing torrents from file.
  loadTorrentFile();

  // Update torrent list every second.
  setInterval(function () {
    updateTorrentList();
  }, 1000);

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Handle IPC events.
// Download torrent.
ipcMain.on('download', (event, arg) => {
  // Check that user selected something.
  const to = showSaveDialog(false);
  if (!to || !arg) return;
  download(arg, to());
});

// Add a torrent from URI.
ipcMain.on('addURI', (event, arg) => {
  showURIWindow();
});

// Add torrent from file.
ipcMain.on('addFile', (event, arg) => {
  // Check that user selected something.
  const from = showOpenDialog('torrent');
  const to = showSaveDialog(false);
  if (!to || !from) return;
  download(from, to);
});

// Show seed setup window.
ipcMain.on('seedFiles', (event, arg) => {
  showSeedWindow();
});

// Save a .torrent file.
ipcMain.on('getTorrentFile', (event, arg) => {
  fs.writeFileSync(showSaveDialog(true), torrents[getTorrent(arg)].torrentFile);
});

// Let user select which files to seed.
ipcMain.on('selectPathToSeed', (event, arg) => {
  if (arg === 'file') event.returnValue = showOpenDialog('file');
  else if (arg === 'dir') event.returnValue = showOpenDialog('dir');
});

// URI given by user.
ipcMain.on('confirmURI', (event, arg) => {
  BrowserWindow.getFocusedWindow().close();
  download(arg, showSaveDialog(false));
});

// Start seeding something.
ipcMain.on('startSeeding', (event, arg) => {
  // Set options.
  const opts = {
    createdBy: creatorString,
    private: arg.private,
    announceList: arg.customTrackers
  };
  // Filter out empty name.
  if (arg.name !== '') opts.name = arg.name;
  // Start seeding.
  client.seed(arg.path, opts, (torrent) => {
    torrents.push(torrent);
  });
});

// Pause / resume a torrent.
// Disabled for now due to being buggy.
ipcMain.on('pauseResume', (event, arg) => {
  if (torrents[getTorrent(arg)].paused) {
    torrents[getTorrent(arg)].paused = false;
    client.add(arg, {
      announce: torrents[getTorrent(arg)].announce,
      path: torrents[getTorrent(arg)].path,
      private: torrents[getTorrent(arg)].private,
      paused: false
    });
  } else {
    client.remove(arg);
    torrents[getTorrent(arg)].paused = true;
  }
});

// Remove a torrent.
ipcMain.on('removeTorrent', (event, arg) => {
  torrents.splice(getTorrent(arg), 1);
  if (client.get(arg)) {
    client.remove(arg, {}, (err) => {
      if (err) console.error(err);
    });
  }
  // Update JSON file with list of torrents.
  updateTorrentFile();
});

// Open folder for torrent.
ipcMain.on('folder', (event, arg) => {
  childProcess.exec(`start "" "${torrents[getTorrent(arg)].path}"`);
});

// Show details window for a torrent
ipcMain.on('details', (event, arg) => {
  const child = new BrowserWindow({
    parent: BrowserWindow.getFocusedWindow(),
    modal: true,
    frame: false,
    width: 800,
    minWidth: 800,
    maxWidth: 800,
    height: 800,
    minHeight: 800,
    maxHeight: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preloadDetailsWindow.js')
    }
  });
  // Load file and send details to window.
  child.loadFile('./html/details.html').then(() => {
    const t = torrents[getTorrent(arg)];
    const details = {
      name: t.name,
      infoHash: t.infoHash,
      magnetURI: t.magnetURI,
      torrentFile: t.torrentFile,
      announce: t.announce,
      pieceLength: t.pieceLength,
      length: t.length,
      numPeers: t.numPeers,
      path: t.path
    };
    child.webContents.send('showDetails', details);
  });
});

// Close currently focused window.
ipcMain.on('closeFocusedWindow', (event, arg) => {
  BrowserWindow.getFocusedWindow().close();
});

// Minimize currently focused window.
ipcMain.on('minimizeFocusedWindow', (event, arg) => {
  BrowserWindow.getFocusedWindow().minimize();
});

// Toggle maximize currently focused window.
ipcMain.on('maximizeFocusedWindow', (event, arg) => {
  if (BrowserWindow.getFocusedWindow().isMaximized()) BrowserWindow.getFocusedWindow().unmaximize();
  else BrowserWindow.getFocusedWindow().maximize();
});

client.on('torrent', function (torrent) {
  // Update UI.
  updateTorrentList();
  // Update JSON file with list of torrents.
  updateTorrentFile();
});

// This function will download a torrent from a magnet URI, torrent file, or info hash.
// Torrent file source can be either a buffer or a URI to the file.
function download (source, file) {
  client.add(source, { path: file, private: true }, (torrent) => {
    torrents.push(torrent);
  });
}

// Shows a save dialog, returns result.
function showSaveDialog (torrentFileOnly) {
  let opts = {};
  if (torrentFileOnly) opts = { filters: [{ name: '.torrent file', extensions: ['torrent'] }] };
  const path = dialog.showSaveDialogSync(BrowserWindow.getFocusedWindow(), opts);
  return path;
}

// Shows a open dialog, returs result.
function showOpenDialog (type) {
  // Type determines what the user is allowed to select.
  let filters = [];
  let properties = [];
  switch (type) {
    case 'torrent':
      filters = [{ name: 'Torrent file', extensions: ['torrent'] }];
      properties = ['openFile'];
      break;
    case 'file':
      filters = [{ name: 'All files', extensions: ['*'] }];
      properties = ['openFile'];
      break;
    case 'dir':
      properties = ['openDirectory'];
      break;
  }
  const path = dialog.showOpenDialogSync(BrowserWindow.getFocusedWindow(), {
    filters: filters,
    properties: properties
  });
  if (path) return path[0];
  else return null;
}

// Shows a window that allows user to seed file(s).
function showSeedWindow () {
  const child = new BrowserWindow({
    parent: BrowserWindow.getFocusedWindow(),
    modal: true,
    frame: false,
    width: 500,
    height: 400,
    webPreferences: {
      preload: path.join(__dirname, 'preloadSeedWindow.js')
    }
  });
  child.loadFile('./html/seed.html');
}

// Shows a modal window that asks for a torrent URI.
function showURIWindow () {
  const child = new BrowserWindow({
    parent: BrowserWindow.getFocusedWindow(),
    modal: true,
    frame: false,
    width: 800,
    minWidth: 800,
    maxWidth: 800,
    height: 180,
    minHeight: 180,
    maxHeight: 180,
    webPreferences: {
      preload: path.join(__dirname, 'preloadURIWindow.js')
    }
  });
  child.loadFile('./html/uri.html');
}

// Updates list of torrents on UI.
function updateTorrentList () {
  // Add all torrents to an array, send that to renderer process.
  const torrentList = [];
  torrents.forEach(torrent => {
    const t = {
      name: torrent.name,
      infoHash: torrent.infoHash,
      magnetURI: torrent.magnetURI,
      torrentFile: torrent.torrentFile,
      announce: torrent.announce,
      paused: torrent.paused,
      pieceLength: torrent.pieceLength,
      lastPieceLength: torrent.lastPieceLength,
      length: torrent.length,
      path: torrent.path
    };
    // Get data that might vary every update from client.
    if (client.get(torrent.infoHash)) {
      const ct = client.get(torrent.infoHash);
      t.downloaded = ct.downloaded;
      t.uploaded = ct.uploaded;
      t.downloadSpeed = ct.downloadSpeed;
      t.uploadSpeed = ct.uploadSpeed;
      t.numPeers = ct.numPeers;
      t.timeRemaining = ct.timeRemaining;
    } else {
      // The torrent is paused.
      t.downloadSpeed = 0;
      t.uploadSpeed = 0;
    }
    torrentList.push(t);
  });
  mainWindow.webContents.send('updateTorrentList', torrentList);
}

// Updates .json file that stores list of torrents.
function updateTorrentFile () {
  let data;
  // Check that directory exists.
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
  // Check that file exists.
  if (fs.existsSync(path.join(dataDir, 'torrents.json'))) {
    // File exists, read data from disk.
    data = fs.readFileSync(path.join(dataDir, 'torrents.json'), 'utf8');
  } else {
    // File does not exist, create empty template.
    data = '{"torrents": []}';
  }
  const json = JSON.parse(data);
  // Create empty array and store all torrents.
  const writeTorrents = [];
  torrents.forEach(torrent => {
    const t = {
      name: torrent.name,
      infoHash: torrent.infoHash,
      magnetURI: torrent.magnetURI,
      torrentFile: torrent.torrentFile,
      announce: torrent.announce,
      length: torrent.length,
      path: torrent.path,
      paused: torrent.paused
    };
    writeTorrents.push(t);
  });
  // Write torrents to disk.
  json.torrents = writeTorrents;
  fs.writeFileSync(path.join(dataDir, 'torrents.json'), JSON.stringify(json), { encoding: 'utf8' });
}

function loadTorrentFile () {
  // Check that file exists.
  if (!fs.existsSync(path.join(dataDir, 'torrents.json'))) return;
  // File exists, read data from disk.
  const data = fs.readFileSync(path.join(dataDir, 'torrents.json'), 'utf8');
  const json = JSON.parse(data);
  // Add all torrents.
  json.torrents.forEach(item => {
    // Check if torrent path has been deleted.
    // If so, remove torrent.
    if (!fs.existsSync(item.path)) {
      return;
    }
    client.add(item.magnetURI, {
      announce: item.announce,
      path: item.path,
      private: item.private,
      paused: item.paused
    }, (torrent) => {
      torrents.push(torrent);
      // Add torrent to client, then remove if paused.
      // This will get all torrent details, like length, etc.
      if (item.paused) {
        client.remove(torrent.infoHash);
      }
    });
  });
}

function getTorrent (infoHash) {
  // Finds torrent with given info hash, returns index.
  let torrent;
  torrents.forEach(item => {
    if (item.infoHash === infoHash) torrent = item;
  });
  if (torrent) return torrents.indexOf(torrent);
}
