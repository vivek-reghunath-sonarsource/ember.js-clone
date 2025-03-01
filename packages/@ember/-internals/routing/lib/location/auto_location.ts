import { history, location, userAgent, window } from '@ember/-internals/browser-environment';
import { set } from '@ember/-internals/metal';
import { getOwner } from '@ember/-internals/owner';
import { Object as EmberObject } from '@ember/-internals/runtime';
import { AnyFn, MethodNamesOf } from '@ember/-internals/utils/types';
import { assert } from '@ember/debug';
import { EmberLocation, UpdateCallback } from './api';
import {
  getFullPath,
  getHash,
  getPath,
  getQuery,
  replacePath,
  supportsHashChange,
  supportsHistory,
} from './util';

/**
@module @ember/routing
*/

/**
  AutoLocation will select the best location option based off browser
  support with the priority order: history, hash, none.

  Clean pushState paths accessed by hashchange-only browsers will be redirected
  to the hash-equivalent and vice versa so future transitions are consistent.

  Keep in mind that since some of your users will use `HistoryLocation`, your
  server must serve the Ember app at all the routes you define.

  Browsers that support the `history` API will use `HistoryLocation`, those that
  do not, but still support the `hashchange` event will use `HashLocation`, and
  in the rare case neither is supported will use `NoneLocation`.

  Example:

  ```app/router.js
  Router.map(function() {
    this.route('posts', function() {
      this.route('new');
    });
  });

  Router.reopen({
    location: 'auto'
  });
  ```

  This will result in a posts.new url of `/posts/new` for modern browsers that
  support the `history` api or `/#/posts/new` for older ones, like Internet
  Explorer 9 and below.

  When a user visits a link to your application, they will be automatically
  upgraded or downgraded to the appropriate `Location` class, with the URL
  transformed accordingly, if needed.

  Keep in mind that since some of your users will use `HistoryLocation`, your
  server must serve the Ember app at all the routes you define.

  @class AutoLocation
  @static
  @protected
*/
export default class AutoLocation extends EmberObject implements EmberLocation {
  declare getURL: () => string;
  declare setURL: (url: string) => void;
  declare onUpdateURL: (callback: UpdateCallback) => void;
  declare formatURL: (url: string) => string;

  concreteImplementation?: EmberLocation;

  implementation = 'auto';

  // FIXME: This is never set
  // See https://github.com/emberjs/ember.js/issues/19515
  /** @internal */
  documentMode: number | undefined;

  /**
    @private

    Will be pre-pended to path upon state change.

    @since 1.5.1
    @property rootURL
    @default '/'
  */
  // Added in reopen to allow overriding via extend
  declare rootURL: string;

  /**
    @private

    The browser's `location` object. This is typically equivalent to
    `window.location`, but may be overridden for testing.

    @property location
    @default environment.location
  */
  // Added in reopen to allow overriding via extend
  declare location: Location;

  /**
    @private

    The browser's `history` object. This is typically equivalent to
    `window.history`, but may be overridden for testing.

    @since 1.5.1
    @property history
    @default environment.history
  */
  // Added in reopen to allow overriding via extend
  declare history: any;

  /**
   @private

    The user agent's global variable. In browsers, this will be `window`.

    @since 1.11
    @property global
    @default window
  */
  // Added in reopen to allow overriding via extend
  declare global: any;

  /**
    @private

    The browser's `userAgent`. This is typically equivalent to
    `navigator.userAgent`, but may be overridden for testing.

    @since 1.5.1
    @property userAgent
    @default environment.history
  */
  // Added in reopen to allow overriding via extend
  declare userAgent: string;

  /**
    @private

    This property is used by the router to know whether to cancel the routing
    setup process, which is needed while we redirect the browser.

    @since 1.5.1
    @property cancelRouterSetup
    @default false
  */
  // Added in reopen to allow overriding via extend
  declare cancelRouterSetup: boolean;

  /**
   Called by the router to instruct the location to do any feature detection
   necessary. In the case of AutoLocation, we detect whether to use history
   or hash concrete implementations.

   @private
  */
  detect(): void {
    let rootURL = this.rootURL;

    assert(
      'rootURL must end with a trailing forward slash e.g. "/app/"',
      rootURL.charAt(rootURL.length - 1) === '/'
    );

    let implementation = detectImplementation({
      location: this.location,
      history: this.history,
      userAgent: this.userAgent,
      rootURL,
      documentMode: this.documentMode,
      global: this.global,
    });

    if (implementation === false) {
      set(this, 'cancelRouterSetup', true);
      implementation = 'none';
    }

    let owner = getOwner(this);
    assert('AutoLocation is unexpectedly missing an owner', owner);
    let concrete = owner.lookup(`location:${implementation}`) as EmberLocation;
    assert(`Could not find location '${implementation}'.`, concrete !== undefined);

    set(concrete, 'rootURL', rootURL);
    set(this, 'concreteImplementation', concrete);
  }

  willDestroy(): void {
    let { concreteImplementation } = this;

    if (concreteImplementation) {
      concreteImplementation.destroy();
    }
  }
}

AutoLocation.reopen({
  rootURL: '/',

  initState: delegateToConcreteImplementation('initState'),
  getURL: delegateToConcreteImplementation('getURL'),
  setURL: delegateToConcreteImplementation('setURL'),
  replaceURL: delegateToConcreteImplementation('replaceURL'),
  onUpdateURL: delegateToConcreteImplementation('onUpdateURL'),
  formatURL: delegateToConcreteImplementation('formatURL'),

  location: location,

  history: history,

  global: window,

  userAgent: userAgent,

  cancelRouterSetup: false,
});

function delegateToConcreteImplementation<N extends MethodNamesOf<Required<EmberLocation>>>(
  methodName: N
) {
  return function (this: AutoLocation, ...args: Parameters<Required<EmberLocation>[N]>) {
    let { concreteImplementation } = this;
    assert(
      "AutoLocation's detect() method should be called before calling any other hooks.",
      concreteImplementation
    );

    // We need this cast because `Parameters` is deferred so that it is not
    // possible for TS to see it will always produce the right type. However,
    // since `AnyFn` has a rest type, it is allowed. See discussion on [this
    // issue](https://github.com/microsoft/TypeScript/issues/47615).
    return (concreteImplementation[methodName] as AnyFn | undefined)?.(...args);
  };
}

/*
  Given the browser's `location`, `history` and `userAgent`, and a configured
  root URL, this function detects whether the browser supports the [History
  API](https://developer.mozilla.org/en-US/docs/Web/API/History) and returns a
  string representing the Location object to use based on its determination.

  For example, if the page loads in an evergreen browser, this function would
  return the string "history", meaning the history API and thus HistoryLocation
  should be used. If the page is loaded in IE8, it will return the string
  "hash," indicating that the History API should be simulated by manipulating the
  hash portion of the location.

*/

interface DetectionOptions {
  location: Location;
  history: History;
  userAgent: string;
  rootURL: string;
  documentMode: number | undefined;
  global: Window | null;
}

function detectImplementation(options: DetectionOptions) {
  let { location, userAgent, history, documentMode, global, rootURL } = options;

  let implementation = 'none';
  let cancelRouterSetup = false;
  let currentPath = getFullPath(location);

  if (supportsHistory(userAgent, history)) {
    let historyPath = getHistoryPath(rootURL, location);

    // If the browser supports history and we have a history path, we can use
    // the history location with no redirects.
    if (currentPath === historyPath) {
      implementation = 'history';
    } else if (currentPath.substr(0, 2) === '/#') {
      history.replaceState({ path: historyPath }, '', historyPath);
      implementation = 'history';
    } else {
      cancelRouterSetup = true;
      replacePath(location, historyPath);
    }
  } else if (supportsHashChange(documentMode, global)) {
    let hashPath = getHashPath(rootURL, location);

    // Be sure we're using a hashed path, otherwise let's switch over it to so
    // we start off clean and consistent. We'll count an index path with no
    // hash as "good enough" as well.
    if (currentPath === hashPath || (currentPath === '/' && hashPath === '/#/')) {
      implementation = 'hash';
    } else {
      // Our URL isn't in the expected hash-supported format, so we want to
      // cancel the router setup and replace the URL to start off clean
      cancelRouterSetup = true;
      replacePath(location, hashPath);
    }
  }

  if (cancelRouterSetup) {
    return false;
  }

  return implementation;
}

/**
  @private

  Returns the current path as it should appear for HistoryLocation supported
  browsers. This may very well differ from the real current path (e.g. if it
  starts off as a hashed URL)
*/
export function getHistoryPath(rootURL: string, location: Location): string {
  let path = getPath(location);
  let hash = getHash(location);
  let query = getQuery(location);
  let rootURLIndex = path.indexOf(rootURL);

  let routeHash: string;
  let hashParts;

  assert(`Path ${path} does not start with the provided rootURL ${rootURL}`, rootURLIndex === 0);

  // By convention, Ember.js routes using HashLocation are required to start
  // with `#/`. Anything else should NOT be considered a route and should
  // be passed straight through, without transformation.
  if (hash.substr(0, 2) === '#/') {
    // There could be extra hash segments after the route
    hashParts = hash.substr(1).split('#');
    // The first one is always the route url
    routeHash = hashParts.shift() as string;

    // If the path already has a trailing slash, remove the one
    // from the hashed route so we don't double up.
    if (path.charAt(path.length - 1) === '/') {
      routeHash = routeHash.substr(1);
    }

    // This is the "expected" final order
    path += routeHash + query;

    if (hashParts.length) {
      path += `#${hashParts.join('#')}`;
    }
  } else {
    path += query + hash;
  }

  return path;
}

/**
  @private

  Returns the current path as it should appear for HashLocation supported
  browsers. This may very well differ from the real current path.

  @method _getHashPath
*/
export function getHashPath(rootURL: string, location: Location): string {
  let path = rootURL;
  let historyPath = getHistoryPath(rootURL, location);
  let routePath = historyPath.substr(rootURL.length);

  if (routePath !== '') {
    if (routePath[0] !== '/') {
      routePath = `/${routePath}`;
    }

    path += `#${routePath}`;
  }

  return path;
}
