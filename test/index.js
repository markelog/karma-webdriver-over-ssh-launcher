import sinon from 'sinon';
import { expect } from 'chai';

import rewire from 'rewire';

let index = rewire('../index');
let createTunnel = index.test.createTunnel;
let SSHwd = index.test.SSHwd;

describe('index', () => {
  let from;
  let to;
  let context;

  let tunnelStub;
  let loggerStub;
  let returnedStub;
  let thenStub;
  let emitterStub;
  let failStub;
  let classStub;

  let createAdit;

  let adit = index.__get__('_adit2');
  let oldWd = index.__get__('wd');

  beforeEach(() => {
    from = {
      hostname: 'from-hostname',
      port: 1
    };

    to = {
      username: 'me',
      hostname: 'to-hostname',
      port: 2
    };

    context = {};
    returnedStub = sinon.stub();
    thenStub = sinon.stub();
    failStub = sinon.stub();

    emitterStub = {
      emit: sinon.stub(),
      on: sinon.stub()
    };

    loggerStub = {
      debug: sinon.stub(),
      create: sinon.stub().returns(returnedStub)
    };

    tunnelStub = {
      to: to,
      promise: {
        fail: failStub,
        then: thenStub
      }
    };

    classStub = {
      open: sinon.stub(),
      close: sinon.stub()
    };

    let logger = {
      create: () => loggerStub
    };

    createAdit = () => {
      createTunnel({
        hostname: from.hostname,
        port: from.port,
        tunnel: to
      }, logger, emitterStub);
    };
  });

  afterEach(() => {
    if (adit.default.restore) {
      adit.default.restore();
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

    it('should close tunnel on "SIGINT" event', (done) => {
      let oldProcessOn = process.on;
      process.on = (event, method) => {
        if (event !== 'SIGINT') {
          return oldProcessOn.apply(this, arguments);
        }

        method.call();
        expect(classStub.close.callCount).to.equal(1);
        done();
      };

      sinon.stub(adit, 'default', () => classStub);
      createAdit();
      process.on = oldProcessOn;
    });

    it('should create tunnel', () => {
      sinon.stub(adit, 'default', (_from, _to, _logger) => {
        expect(_from.hostname).to.equal(from.hostname);
        expect(_from.port).to.equal(from.port);

        expect(_to.hostname).to.equal(to.hostname);
        expect(_to.port).to.equal(to.port);

        expect(_logger).to.equal(loggerStub);

        return classStub;
      });

      createAdit();
    });

    describe('"exit" event', () => {
      let fnStub;

      beforeEach(() => {
        sinon.stub(adit, 'default', () => classStub);
        fnStub = sinon.stub();

        createAdit();

        // Call "exit" handler
        emitterStub.on.firstCall.args[1](fnStub);
      });

      it('should emit "exit" event', () => {
        expect(emitterStub.on.callCount).to.equal(1);
        expect(emitterStub.on.firstCall.args[0]).to.equal('exit');
      });

      it('should close tunnel', () => {
        expect(classStub.close.callCount).to.equal(1);
      });

      it('should output debug info to the console', () => {
        expect(loggerStub.debug.callCount).to.equal(1);
        expect(loggerStub.debug.firstCall.args[0]).to.equal('Shutting down the tunnel');
      });

      it('should call funarg of exit event', () => {
        expect(fnStub.callCount).to.equal(1);
      });
    });
  });

  describe('SSHwd', () => {
    let oldStartStub;

    beforeEach(() => {
      oldStartStub = sinon.stub();

      index.__set__('wd', function wd() {
        this._start = oldStartStub;
      });

      SSHwd.call(context, 1, 2, loggerStub, tunnelStub, emitterStub);
    });

    it('should call the webdriver-launcher with correct arguments and context', () => {
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

    it('should handle erroneous situation', () => {

      // Execute fail callback
      failStub.firstCall.args[0]();

      expect(emitterStub.emit.callCount).to.equal(1);
      expect(emitterStub.emit.firstCall.args[0]).to.equal('browser_process_failure');
    });

    it('should mangle url which will be passed to the browser through wd', () => {
      // Usually called though karma
      context._start('http://localhost:9876/?test=1');

      // Execute successful callback
      thenStub.firstCall.args[0]();

      expect(oldStartStub.firstCall.args[0]).to.equal('http://to-hostname:2/?test=1');
    });
  });
});
