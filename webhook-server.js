const http = require('http');
const createHandler = require('github-webhook-handler');
const { exec } = require('child_process');

const handler = createHandler({ path: '/hooks/pull', secret: 'gretel-screens' });

http.createServer((req, res) => {
  handler(req, res, err => {
    res.statusCode = 404;
    res.end('no such location');
  });
}).listen(3001, () => {
  console.log('Webhook server listening on port 3001');
});

handler.on('push', event => {
  const branch = event.payload.ref;

  if (branch === 'refs/heads/main') {
    console.log('🚀 Push to main detected. Pulling changes...');
    exec(
      'cd /Users/gretel/Desktop/gretel-screens && git fetch origin && git reset --hard origin/main && pm2 restart gretel-screens',
      (err, stdout, stderr) => {
        if (err) {
          console.error('Error running deploy script:', stderr);
        } else {
          console.log('✅ Pulled and restarted:', stdout);
        }
      }
    );
  }
});
