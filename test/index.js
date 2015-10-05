import sinon from 'sinon';
import { expect } from 'chai';

import rewire from 'rewire';

let index = rewire('../index');
let createTunnel = index.test.createTunnel;
let SSHwd = index.test.SSHwd;

describe('index', () => {
  let stubs = {};
  let oldWd = index.__get__('wd');

  afterEach(() => {
    for (let stub in stubs) {
      stubs[stub].restore();
    }

    index.__set__('wd', oldWd);
  });

  describe('createTunnel', () => {
    it('should return if tunnel is not needed', () => {
      let result = createTunnel({
        tunnel: false
      });

      expect(result).to.equal(false);
    });

    it('should create tunnel', () => {

      // babel side effect :-(
      let adit2 = index.__get__('_adit2');
      let loggerCreate = {};

      let from = {
        hostname: 'a',
        port: 1
      };

      let to = {
        username: 'me',
        hostname: 'b',
        port: 2
      };

      let logger = {
        create: () => loggerCreate
      };

      let emitterStub = {
        emit: sinon.stub(),
        on: sinon.stub()
      };
      let openStub = sinon.stub();
      let closeStub = sinon.stub();

      // Can't use sinon here, for some reason :-(
      let processOnCalled = false;
      let oldProcessOn = process.on;
      process.on = (event, method) => {
        if (event !== 'SIGINT') {
          return oldProcessOn.apply(this, arguments);
        }

        expect(method).to.be.a('function');

        method.call();
        expect(closeStub.callCount).to.equal(1);

        processOnCalled = true;
      };

      sinon.stub(adit2, 'default', (_from, _to, _logger) => {
        expect(_from.hostname).to.equal(from.hostname);
        expect(_from.port).to.equal(from.port);

        expect(_to.hostname).to.equal(to.hostname);
        expect(_to.port).to.equal(to.port);

        expect(_logger).to.equal(loggerCreate);

        return {
          open: openStub,
          close: closeStub
        };
      });

      createTunnel({
        hostname: from.hostname,
        port: from.port,
        tunnel: to
      }, logger, emitterStub);

      expect(openStub.callCount).to.equal(1);
      expect(processOnCalled).to.equal(true);

      process.on = oldProcessOn;

      adit2.default.restore();
    });

    it('should react on "exit" event', () => {
      // babel side effect :-(
      let adit2 = index.__get__('_adit2');

      let debugStub = sinon.stub();

      let loggerCreate = {
        debug: debugStub
      };

      let from = {
        hostname: 'a',
        port: 1
      };

      let to = {
        username: 'me',
        hostname: 'b',
        port: 2
      };

      let logger = {
        create: () => loggerCreate
      };

      let emitterStub = {
        emit: sinon.stub(),
        on: sinon.stub()
      };
      let openStub = sinon.stub();
      let closeStub = sinon.stub();

      sinon.stub(adit2, 'default', () => {
        return {
          open: openStub,
          close: closeStub
        };
      });

      createTunnel({
        hostname: from.hostname,
        port: from.port,
        tunnel: to
      }, logger, emitterStub);

      expect(emitterStub.on.callCount).to.equal(1);
      expect(emitterStub.on.getCall(0).args[0]).to.equal('exit');

      let method = emitterStub.on.getCall(0).args[1];
      let fnStub = sinon.stub();
      method.call(this, fnStub);

      expect(closeStub.callCount).to.equal(1);
      expect(debugStub.callCount).to.equal(1);
      expect(debugStub.getCall(0).args[0]).to.equal('Shutting down the tunnel');
      expect(fnStub.callCount).to.equal(1);
    });

  });

  describe('SSHwd', () => {
    it('should call the webdriver-launcher with correct arguments and context', () => {
      let context = {};
      let called = false;

      index.__set__('wd', function wd(baseBrowserDecorator, args, logger, tunnel, emitter) {
        expect(this).to.equal(context);
        expect(baseBrowserDecorator).to.equal(1);
        expect(args).to.equal(2);
        expect(logger).to.equal(3);
        expect(tunnel).to.equal(undefined);
        expect(emitter).to.equal(undefined);
        called = true;
      });

      SSHwd.call(context, 1, 2, 3, false, 5);
      expect(called).to.equal(true);
    });

    it('should establish pretend connect to the remote server', () => {
      let context = {};
      let called = false;

      let returnLoggerStub = sinon.stub();
      let failStub = sinon.stub();
      let loggerStub = {
        create: sinon.stub().returns(returnLoggerStub)
      };

      let tunnelStub = {
        promise: {
          fail: failStub
        },
        close: sinon.stub()
      };

      let emitterStub = {
        emit: sinon.stub(),
        on: sinon.stub()
      };

      index.__set__('wd', function wd(baseBrowserDecorator, args, logger, tunnel, emitter) {
        expect(this).to.equal(context);
        expect(baseBrowserDecorator).to.equal(1);
        expect(args).to.equal(2);
        expect(logger).to.equal(returnLoggerStub);
        expect(tunnel).to.equal(undefined);
        expect(emitter).to.equal(undefined);
        called = true;
      });

      SSHwd.call(context, 1, 2, loggerStub, tunnelStub, emitterStub);
      expect(called).to.equal(true);
      expect(context).to.have.property('_start');

      expect(loggerStub.create.callCount).to.equal(1);

      let failMethod = failStub.getCall(0).args[0];

      expect(emitterStub.emit.callCount).to.equal(0);
      failMethod();
      expect(emitterStub.emit.callCount).to.equal(1);
    });

    it('should proxy wd _start call and work with url', () => {
      let context = {};
      let oldStartStub = sinon.stub();

      let returnLoggerStub = sinon.stub();
      let failStub = sinon.stub();
      let thenStub = sinon.stub();
      let loggerStub = {
        create: sinon.stub().returns(returnLoggerStub)
      };

      let tunnelStub = {
        to: {
          hostname: 'a',
          port: 2
        },
        promise: {
          fail: failStub,
          then: thenStub
        }
      };

      let emitterStub = {
        emit: sinon.stub(),
        on: sinon.stub()
      };

      index.__set__('wd', function wd(baseBrowserDecorator, args, logger, tunnel, emitter) {
        expect(this).to.equal(context);
        expect(baseBrowserDecorator).to.equal(1);
        expect(args).to.equal(2);
        expect(logger).to.equal(returnLoggerStub);
        expect(tunnel).to.equal(undefined);
        expect(emitter).to.equal(undefined);
        this._start = oldStartStub;
      });

      SSHwd.call(context, 1, 2, loggerStub, tunnelStub, emitterStub);

      context._start('http://localhost:9876/?bla=1');
      thenStub.getCall(0).args[0].call();
      expect(oldStartStub.getCall(0).args[0]).to.equal('http://a:2/?bla=1');
    });
  });
});
