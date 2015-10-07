require('babel/polyfill');

import * as url from 'url';

import * as karmaWD from 'karma-webdriver-launcher';

import Adit from 'adit';

let wd = karmaWD['launcher:WebDriver'][1];
let injects = wd.$inject.slice();

function createTunnel(config, logger, emitter) {
  if (config.tunnel === false) {
    return false;
  }

  let log = logger.create('ssh tunnel');
  let adit = new Adit({

    // From
    hostname: config.hostname,
    port: config.port
  }, {

    // To
    hostname: config.tunnel.hostname,
    port: config.tunnel.port
  }, log);

  adit.open(3);

  emitter.on('exit', (done) => {
    log.debug('Shutting down the tunnel');
    adit.close();

    done();
  });

  // Just in case
  process.on('SIGINT', () => adit.close());

  return adit;
}

function SSHwd(baseBrowserDecorator, args, logger, tunnel, emitter) {
  if (tunnel === false) {
    wd.call(this, baseBrowserDecorator, args, logger);
    return;
  }

  let log = logger.create('ssh proxy');

  // Do not output wd driver prefix, output ours
  log.create = () => log;

  // Exit if we can't connect to the remote host
  tunnel.promise.fail(() => emitter.emit('browser_process_failure', this));

  // Mix parent context with ours and initialize wd
  wd.call(this, baseBrowserDecorator, args, log);
  this.name += ' through SSH proxy';

  let wdStart = this._start;

  // Redefine port and hostname, so we can do
  // remote-host:remote-port -> local-host:local-port
  this._start = (addr) => {
    addr = url.parse(addr, true);

    addr.hostname = tunnel.to.hostname;
    addr.host = tunnel.to.hostname + ':' + tunnel.to.port;
    addr.port = tunnel.to.port;

    addr = url.format(addr);

    tunnel.promise.then(() => {
      wdStart.call(this, addr);
    });
  };
}

SSHwd.prototype = wd.prototype;
SSHwd.$inject = injects;
SSHwd.$inject.push('createTunnel', 'emitter');

module.exports = {
  createTunnel: ['factory', createTunnel],
  'launcher:SSHWebDriver': ['type', SSHwd]
};

module.exports.test = {
  createTunnel: createTunnel,
  SSHwd: SSHwd
};
