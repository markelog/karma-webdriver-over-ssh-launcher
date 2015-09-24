karma-webdriver-over-ssh-launcher
========================

A plugin for Karma to launch Remote WebDriver instances over ssh host

## Usage

```bash
$ npm install karma-webdriver-over-ssh-launcher
```

Basically, this is the same as [karma-wedriver-launcher](https://github.com/karma-runner/karma-webdriver-launcher), with one extra feature - by defining `tunnel` object in our karma config -

```js
module.exports = function(karma) {

  var webdriverConfig = {
    hostname: 'ondemand.saucelabs.com',
    port: 80,
    user: 'USERNAME',
    pwd: 'APIKEY'
  }

  config.set({
    tunnel: {
      hostname: "some-remote-server",
      port: 8000 // port of "some-remote-server"

      // or range of ports -
      port: [8000, 9000]
    },

    customLaunchers: {
      'IE7': {
        base: 'SSHWebDriver', // Not 'WebDriver' but 'SSHWebDriver'
        config: webdriverConfig,
        browserName: 'internet explorer',
        platform: 'Windows XP',
        version: '10',
        'x-ua-compatible': 'IE=EmulateIE7',
        name: 'Karma',
        pseudoActivityInterval: 30000
      }
    },

    browsers: ['IE7'],

    ...

  });
});
```

You can proxy all your `localhost:9876` to `some-remote-server:8000`. Or use it as simple `karma-wedriver-launcher` by specifing `tunnel` value to `false` :-).

## Why?
In some cases, your selenium grid might have access to `some-remote-server:8000`, but might not have one to localhost:9876.
