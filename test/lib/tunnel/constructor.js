import * as fs from 'fs';

import sinon from 'sinon';
import { expect } from 'chai';
import rewire from 'rewire';

import Connection from 'ssh2';

let Tunnel = rewire('../../../lib/tunnel');

describe('Tunnel#constructor', () => {
  var path = Tunnel.__get__('path');
  var oldSock = process.env.SSH_AUTH_SOCK;

  beforeEach(() => {
    sinon.stub(path, 'join', () => __filename);
  });

  afterEach(() => {
    process.env.SSH_AUTH_SOCK = oldSock;
    path.join.restore();
  });

  it('should define all needed properties', function() {
    process.env.SSH_AUTH_SOCK = 'tmp';

    let from = {
      hostname: 'a',
      port: 1
    };

    let to = {
      hostname: 'b',
      port: 2
    };

    let tunnel = new Tunnel(from, to);

    expect(tunnel.from).to.deep.equal(from);
    expect(tunnel.to).to.deep.equal(to);

    expect(tunnel.portRange).to.equal(to.port);
    expect(tunnel.to.port).to.equal(to.port);

    expect(tunnel.username).to.equal(process.env.USER);
    expect(tunnel.agent).to.equal('tmp');
    expect(tunnel.key).to.equal(undefined);

    expect(tunnel.defer).to.equal(undefined);

    expect(tunnel.promise).to.have.property('then');
    expect(tunnel.promise).to.not.have.property('resolve');

    expect(tunnel.logger).to.not.have.property('info', 'error');
    expect(tunnel.connection).to.be.an.instanceof(Connection);

    expect(tunnel.retryTimes).to.be.equal(0);
  });

  it('should define all needed properties with private key', function() {
    delete process.env.SSH_AUTH_SOCK;

    let from = {
      hostname: 'a',
      port: 1
    };

    let to = {
      hostname: 'b',
      port: 2
    };

    let tunnel = new Tunnel(from, to);

    expect(tunnel.from).to.deep.equal(from);
    expect(tunnel.to).to.deep.equal(to);

    expect(tunnel.portRange).to.equal(to.port);
    expect(tunnel.to.port).to.equal(to.port);

    expect(tunnel.username).to.equal(process.env.USER);
    expect(tunnel.agent).to.equal(undefined);
    expect(tunnel.key).to.be.instanceof(Buffer);

    expect(tunnel.defer).to.equal(undefined);

    expect(tunnel.promise).to.have.property('then');
    expect(tunnel.promise).to.not.have.property('resolve');

    expect(tunnel.logger).to.not.have.property('info', 'error');
    expect(tunnel.connection).to.be.an.instanceof(Connection);

    expect(tunnel.retryTimes).to.be.equal(0);
  });

  it('should define correct logger', function() {
    let from = {
      hostname: 'a',
      port: 1
    };

    let to = {
      hostname: 'b',
      port: 2
    };

    let logger = {};

    let tunnel = new Tunnel(from, to, logger);

    expect(tunnel.logger).to.equal(logger);
  });

  it('should define port with port range', function() {
    let from = {
      hostname: 'a',
      port: 1
    };

    let to = {
      hostname: 'b',
      port: [1,5]
    };

    let tunnel = new Tunnel(from, to);

    expect(tunnel.to.port).to.be.within(1, 5);
    expect(tunnel.portRange).to.equal(to.port);
    expect(to.port).to.not.equal(tunnel.port);
  });

  it('should custom username and key', function() {
    let from = {
      hostname: 'a',
      port: 1,
      key: __filename
    };

    let to = {
      hostname: 'b',
      port: [1,5],
      username: 'me'
    };

    let tunnel = new Tunnel(from, to);

    expect(tunnel.to.username).to.equal('me');
    expect(tunnel.from.key).to.be.an('string');
  });
});
