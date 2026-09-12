const { spawn, exec } = require('child_process');
const path = require('path');

const rootDir = __dirname;
const webDir = path.join(rootDir, 'aeropulse-web');
const isWin = process.platform === 'win32';

console.log('\x1b[32m============================================================\x1b[0m');
console.log('\x1b[1m\x1b[36m   ✈️   AEROPULSE FULL-STACK BAŞLATILIYOR...\x1b[0m');
console.log('\x1b[32m============================================================\x1b[0m');
console.log('📡 \x1b[33mBackend API :\x1b[0m  http://localhost:5253  (Swagger: /swagger)');
console.log('💻 \x1b[33mFrontend UI :\x1b[0m  http://localhost:4200');
console.log('⚡ \x1b[90mDurdurmak için: CTRL + C\x1b[0m');
console.log('\x1b[32m============================================================\x1b[0m\n');

function pipeOutput(child, prefix, colorCode) {
  const format = (data) => {
    const lines = data.toString().split(/\r?\n/);
    for (const line of lines) {
      if (line.trim().length > 0) {
        console.log(`${colorCode}${prefix}\x1b[0m ${line}`);
      }
    }
  };
  child.stdout.on('data', format);
  child.stderr.on('data', format);
}

// 1. Start Backend (.NET Web API)
console.log('\x1b[36m[Sistem]\x1b[0m Backend (.NET API) başlatılıyor...');
const backendProcess = spawn('dotnet', ['run', '--project', 'src/AeroPulse.API'], {
  cwd: rootDir,
  shell: true,
  stdio: ['inherit', 'pipe', 'pipe']
});
pipeOutput(backendProcess, '[Backend 5253]', '\x1b[36m');

// 2. Start Frontend (Angular Web)
console.log('\x1b[35m[Sistem]\x1b[0m Frontend (Angular) başlatılıyor...');
const npmCmd = isWin ? 'npm.cmd' : 'npm';
const frontendProcess = spawn(npmCmd, ['run', 'dev:web'], {
  cwd: webDir,
  shell: true,
  stdio: ['inherit', 'pipe', 'pipe']
});
pipeOutput(frontendProcess, '[Frontend 4200]', '\x1b[35m');

function killProcess(child) {
  if (!child || !child.pid) return;
  try {
    if (isWin) {
      exec(`taskkill /pid ${child.pid} /T /F`, () => {});
    } else {
      child.kill('SIGTERM');
    }
  } catch (e) {
    // ignore
  }
}

let isCleaningUp = false;
function cleanup() {
  if (isCleaningUp) return;
  isCleaningUp = true;
  console.log('\n\x1b[33m[Sistem] Kapatılıyor, lütfen bekleyin...\x1b[0m');
  killProcess(backendProcess);
  killProcess(frontendProcess);
  setTimeout(() => {
    process.exit(0);
  }, 1000);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
