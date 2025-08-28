#!/usr/bin/env node

const { createTunnel } = require('localtunnel');
const chalk = require('chalk');

// Configuration - can be overridden by environment variables
const PORT = process.env.PORT || 3000;
const SUBDOMAIN = process.env.TUNNEL_SUBDOMAIN || null;
const HOST = process.env.TUNNEL_HOST || 'https://loca.lt';

async function startTunnel() {
  try {
    console.log(chalk.blue('🚇 Starting localtunnel...'));
    console.log(chalk.gray(`Local server: http://localhost:${PORT}`));
    if (SUBDOMAIN) {
      console.log(chalk.gray(`Custom subdomain: ${SUBDOMAIN}`));
    }
    console.log(chalk.gray(`Tunnel host: ${HOST}`));
    
    const tunnel = await createTunnel({
      port: PORT,
      subdomain: SUBDOMAIN,
      host: HOST
    });

    const url = tunnel.url;
    console.log(chalk.green('✅ Tunnel created successfully!'));
    console.log(chalk.cyan(`🌐 Public URL: ${url}`));
    console.log(chalk.gray('Press Ctrl+C to stop the tunnel'));
    
    // Handle tunnel events
    tunnel.on('close', () => {
      console.log(chalk.yellow('🔌 Tunnel closed'));
    });

    tunnel.on('error', (err) => {
      console.error(chalk.red('❌ Tunnel error:'), err);
    });

    tunnel.on('request', (info) => {
      console.log(chalk.gray(`📡 Request: ${info.method} ${info.path}`));
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n🛑 Shutting down tunnel...'));
      tunnel.close();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log(chalk.yellow('\n🛑 Shutting down tunnel...'));
      tunnel.close();
      process.exit(0);
    });

  } catch (error) {
    console.error(chalk.red('❌ Failed to create tunnel:'), error.message);
    if (error.message.includes('subdomain')) {
      console.log(chalk.yellow('💡 Try removing the subdomain or using a different one'));
    }
    process.exit(1);
  }
}

// Check if localtunnel is installed
try {
  require.resolve('localtunnel');
} catch (error) {
  console.error(chalk.red('❌ localtunnel is not installed.'));
  console.log(chalk.yellow('Please install it first:'));
  console.log(chalk.cyan('npm install --save-dev localtunnel'));
  process.exit(1);
}

// Check if chalk is installed
try {
  require.resolve('chalk');
} catch (error) {
  console.error(chalk.red('❌ chalk is not installed.'));
  console.log(chalk.yellow('Please install it first:'));
  console.log(chalk.cyan('npm install --save-dev chalk'));
  process.exit(1);
}

// Start the tunnel
startTunnel();
