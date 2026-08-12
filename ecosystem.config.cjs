// PM2 ecosystem file for watch-file-server.
//
// Why this file is .cjs (not .js):
//   The project's package.json declares `"type": "module"`, which makes every
//   `.js` file an ES module — so plain `module.exports = {...}` in this file
//   throws `ReferenceError: module is not defined`. PM2 loads this file with
//   `require()`, which only works with CommonJS. Renaming to `.cjs` forces
//   Node to treat it as CommonJS regardless of the package.json `type`.
//
// Why this exists:
//   Running `npm start` in a plain shell dies the moment the terminal closes
//   or the machine reboots. PM2 keeps the app alive across crashes AND across
//   OS reboots once you run `pm2 startup` + `pm2 save`.
//
// One-time setup:
//
//   # 1. Install PM2 globally (any platform)
//   npm install -g pm2
//
//   # 2. Build the TS source → dist/index.js
//   npm run build
//
//   # 3. Start the app under PM2 (uses THIS file)
//   pm2 start ecosystem.config.cjs
//   # … or use the shortcut: npm run pm2:start
//
//   # 4. Snapshot the running process list so PM2 can restore it after reboot
//   pm2 save
//   # shortcut: npm run pm2:save
//
//   # 5. Register PM2 with the OS so it starts on boot:
//      • Linux / macOS : pm2 startup
//                        (prints a `sudo env PATH=... pm2 startup ...` line — run it)
//      • Windows       : npm install -g pm2-windows-startup
//                        pm2-startup install        (registers a Windows service)
//                        pm2 save
//
// After step 5, the OS brings PM2 up at boot; PM2 re-reads the saved list and
// respawns `watch-file-server`. After that, even a hard power-off cycle
// resumes the watcher.
//
// Day-to-day commands:
//
//   pm2 status                                 # list all processes
//   pm2 logs watch-file-server                 # tail combined logs
//   pm2 logs watch-file-server --lines 200    # last 200 lines
//   pm2 restart watch-file-server              # rolling restart
//   pm2 stop watch-file-server                 # stop without removing
//   pm2 delete watch-file-server               # remove from PM2
//   pm2 monit                                  # live CPU/memory dashboard
//
// Implementation notes:
//
//   • `dotenv` is loaded inside src/index.ts via `import 'dotenv/config'`,
//     so all .env variables are picked up automatically — no extra wiring
//     needed in this file.
//   • `watch: false` because chokidar already watches the download directory.
//     Watching dist/ with PM2 would cause pointless restarts on every rebuild.
//   • A single fork instance is enough: the watcher uses an in-memory serial
//     queue, so multiple workers on the same folder would just duplicate work.
//   • No `out_file` / `error_file` are set — PM2 uses its default location
//     (typically ~/.pm2/logs/) and you view logs in the terminal with
//     `pm2 logs watch-file-server`. If you want the project directory
//     clutter-free, this is the way; if you'd rather pin logs to disk, add
//     `out_file: 'logs/out.log'` + `error_file: 'logs/error.log'` here.
//
// Windows-specific note:
//   On Windows there is no `pm2 startup` — instead use the pm2-windows-startup
//   helper listed in step 5. The rest of the commands are identical.

module.exports = {
  apps: [
    {
      name: 'watch-file-server',
      script: 'dist/index.js',
      cwd: __dirname,

      // Respawn on every exit (crash, OOM, manual `pm2 stop`, …).
      autorestart: true,
      // Backoff between respawns to avoid tight crash loops.
      restart_delay: 2000,
      // Cap memory so a leak can't accumulate over long uptimes.
      max_memory_restart: '512M',

      // Single process — see the header notes.
      instances: 1,
      exec_mode: 'fork',

      // PM2 must NOT watch files (chokidar does that).
      watch: false,

      // No `out_file` / `error_file` — logs land in PM2's default location
      // (~/.pm2/logs/ on most platforms). View them live with:
      //     pm2 logs watch-file-server

      // Minimal env. Everything else lives in .env (loaded by dotenv inside the app).
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};