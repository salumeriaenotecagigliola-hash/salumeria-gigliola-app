const { execSync } = require('child_process');
try {
  const diff = execSync('git status --porcelain').toString();
  console.log('Git status:\n', diff);
  execSync('git checkout public/logo-192.png public/logo-512.png');
  console.log('Successfully restored original extended logo files!');
} catch (err) {
  console.error('Error running git command:', err.message);
}
