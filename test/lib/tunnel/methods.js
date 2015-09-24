import sinon from 'sinon';
import { expect } from 'chai';
import Connection from 'ssh2';
import {readFileSync as read} from 'fs';

import Tunnel from '../../../lib/tunnel';

describe('Tunnel methods', () => {
  describe('Tunnel#connect', () => {
    it('should invoke ssh "connect" method', () => {
      let from = {
        hostname: 'a',
        port: 1,
        key: __filename
      };

      let to = {
        username: 'me',
        hostname: 'b',
        port: 2
      };

      let tunnel = new Tunnel(from, to);
      let stub = sinon.stub(tunnel.connection, 'connect');
      tunnel.connect(2);

      var call = stub.getCall(0).args[0];
      expect(call.host).to.equal('b');
      expect(call.port).to.equal(22);
      expect(call.username).to.equal('me');
      expect(call.privateKey).to.be.an('object');

      expect(tunnel.retryTimes).to.equal(2);

      stub.restore();
    });

    it('should invoke ssh "connect" method without arguments', () => {
      let from = {
        hostname: 'a',
        port: 1,
        key: __filename
      };

      let to = {
        username: 'me',
        hostname: 'b',
        port: 2
      };

      let tunnel = new Tunnel(from, to);
      let stub = sinon.stub(tunnel.connection, 'connect');
      tunnel.connect();

      expect(tunnel.retryTimes).to.equal(0);

      stub.restore();
    });
  });

  describe('Tunnel#close', () => {
    it('should close connection', () => {
      let from = {
        hostname: 'a',
        port: 1,
        key: __filename
      };

      let to = {
        username: 'me',
        hostname: 'b',
        port: 2
      };

      let tunnel = new Tunnel(from, to);
      let stubs = {
        connect: sinon.stub(tunnel.connection, 'connect'),
        end: sinon.stub(tunnel.connection, 'end')
      };
      tunnel.connect();
      tunnel.close();

      expect(stubs.end.calledOnce).to.equal(true);
    });
  });

  describe('Tunnel#reTry', () => {
    var stubs = {};

    afterEach(() => {
      for (let stub in stubs) {
        stubs[stub].restore();
      }
    });

    it('should try to reconnect when there is no more attemps', () => {
      let from = {
        hostname: 'a',
        port: 1
      };

      let to = {
        username: 'me',
        hostname: 'b',
        port: [1,5]
      };

      let logger = { info: () => {}};

      let tunnel = new Tunnel(from, to, logger);
      stubs = {
        info: sinon.stub(logger, 'info'),
        addEvents: sinon.stub(tunnel, 'addEvents'),
        connect: sinon.stub(tunnel, 'connect'),
        end: sinon.stub(tunnel.connection, 'end')
      };

      let promise = tunnel.promise;

      tunnel.connect();
      tunnel.reTry('test');

      return promise.fail((error) => {
        expect(error).to.equal('test');

        expect(stubs.info.callCount).to.equal(0);
        expect(stubs.addEvents.callCount).to.equal(0);
        expect(stubs.connect.callCount).to.equal(1);
        expect(stubs.end.callCount).to.equal(0);
      });
    });

    it('should try to reconnect when there is one more attemp', () => {
      let from = {
        hostname: 'a',
        port: 1
      };

      let to = {
        username: 'me',
        hostname: 'b',
        port: [1,5]
      };

      let logger = { info: () => {}};

      let tunnel = new Tunnel(from, to, logger);
      stubs = {
        info: sinon.stub(logger, 'info'),
        addEvents: sinon.stub(tunnel, 'addEvents'),
        connect: sinon.stub(tunnel.connection, 'connect'),
        end: sinon.stub(tunnel.connection, 'end')
      };

      let promise = tunnel.promise;

      tunnel.connect(1);
      tunnel.reTry('test');
      tunnel.reTry('test');

      return promise.fail((error) => {
        expect(error).to.equal('test');

        expect(stubs.info.callCount).to.equal(1);
        expect(stubs.addEvents.callCount).to.equal(1);
        expect(stubs.connect.callCount).to.equal(1);
        expect(stubs.end.callCount).to.equal(1);

        expect(stubs.info.getCall(0).args[0]).to.equal('Retrying to connect, %s tries left');
        expect(stubs.info.getCall(0).args[1]).to.equal(1);
      });
    });
  });
});
