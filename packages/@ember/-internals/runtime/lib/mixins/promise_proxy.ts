import { get, setProperties, computed, Mixin } from '@ember/-internals/metal';
import { AnyFn, MethodNamesOf } from '@ember/-internals/utils/types';
import EmberError from '@ember/error';
import RSVP from 'rsvp';
import CoreObject from '../system/core_object';

/**
  @module @ember/object
*/

function tap<T>(proxy: PromiseProxyMixin<T>, promise: RSVP.Promise<T>) {
  setProperties(proxy, {
    isFulfilled: false,
    isRejected: false,
  });

  return promise.then(
    (value) => {
      if (
        !(proxy as unknown as CoreObject).isDestroyed &&
        !(proxy as unknown as CoreObject).isDestroying
      ) {
        setProperties(proxy, {
          content: value,
          isFulfilled: true,
        });
      }
      return value;
    },
    (reason) => {
      if (
        !(proxy as unknown as CoreObject).isDestroyed &&
        !(proxy as unknown as CoreObject).isDestroying
      ) {
        setProperties(proxy, {
          reason,
          isRejected: true,
        });
      }
      throw reason;
    },
    'Ember: PromiseProxy'
  );
}

/**
  A low level mixin making ObjectProxy promise-aware.

  ```javascript
  import { resolve } from 'rsvp';
  import $ from 'jquery';
  import ObjectProxy from '@ember/object/proxy';
  import PromiseProxyMixin from '@ember/object/promise-proxy-mixin';

  let ObjectPromiseProxy = ObjectProxy.extend(PromiseProxyMixin);

  let proxy = ObjectPromiseProxy.create({
    promise: resolve($.getJSON('/some/remote/data.json'))
  });

  proxy.then(function(json){
     // the json
  }, function(reason) {
     // the reason why you have no json
  });
  ```

  the proxy has bindable attributes which
  track the promises life cycle

  ```javascript
  proxy.get('isPending')   //=> true
  proxy.get('isSettled')  //=> false
  proxy.get('isRejected')  //=> false
  proxy.get('isFulfilled') //=> false
  ```

  When the $.getJSON completes, and the promise is fulfilled
  with json, the life cycle attributes will update accordingly.
  Note that $.getJSON doesn't return an ECMA specified promise,
  it is useful to wrap this with an `RSVP.resolve` so that it behaves
  as a spec compliant promise.

  ```javascript
  proxy.get('isPending')   //=> false
  proxy.get('isSettled')   //=> true
  proxy.get('isRejected')  //=> false
  proxy.get('isFulfilled') //=> true
  ```

  As the proxy is an ObjectProxy, and the json now its content,
  all the json properties will be available directly from the proxy.

  ```javascript
  // Assuming the following json:
  {
    firstName: 'Stefan',
    lastName: 'Penner'
  }

  // both properties will accessible on the proxy
  proxy.get('firstName') //=> 'Stefan'
  proxy.get('lastName')  //=> 'Penner'
  ```

  @class PromiseProxyMixin
  @public
*/
interface PromiseProxyMixin<T> {
  reason: unknown;

  readonly isPending: boolean;
  readonly isSettled: boolean;

  isRejected: boolean;
  isFulfilled: boolean;

  promise: Promise<T>;

  then: this['promise']['then'];
  catch: this['promise']['catch'];
  finally: this['promise']['finally'];
}
const PromiseProxyMixin = Mixin.create({
  /**
    If the proxied promise is rejected this will contain the reason
    provided.

    @property reason
    @default null
    @public
  */
  reason: null,

  /**
    Once the proxied promise has settled this will become `false`.

    @property isPending
    @default true
    @public
  */
  isPending: computed('isSettled', function () {
    return !get(this, 'isSettled');
  }).readOnly(),

  /**
    Once the proxied promise has settled this will become `true`.

    @property isSettled
    @default false
    @public
  */
  isSettled: computed('isRejected', 'isFulfilled', function () {
    return get(this, 'isRejected') || get(this, 'isFulfilled');
  }).readOnly(),

  /**
    Will become `true` if the proxied promise is rejected.

    @property isRejected
    @default false
    @public
  */
  isRejected: false,

  /**
    Will become `true` if the proxied promise is fulfilled.

    @property isFulfilled
    @default false
    @public
  */
  isFulfilled: false,

  /**
    The promise whose fulfillment value is being proxied by this object.

    This property must be specified upon creation, and should not be
    changed once created.

    Example:

    ```javascript
    import ObjectProxy from '@ember/object/proxy';
    import PromiseProxyMixin from '@ember/object/promise-proxy-mixin';

    ObjectProxy.extend(PromiseProxyMixin).create({
      promise: <thenable>
    });
    ```

    @property promise
    @public
  */
  promise: computed({
    get() {
      throw new EmberError("PromiseProxy's promise must be set");
    },
    set(_key, promise: RSVP.Promise<unknown>) {
      return tap(this, promise);
    },
  }),

  /**
    An alias to the proxied promise's `then`.

    See RSVP.Promise.then.

    @method then
    @param {Function} callback
    @return {RSVP.Promise}
    @public
  */
  then: promiseAlias('then'),

  /**
    An alias to the proxied promise's `catch`.

    See RSVP.Promise.catch.

    @method catch
    @param {Function} callback
    @return {RSVP.Promise}
    @since 1.3.0
    @public
  */
  catch: promiseAlias('catch'),

  /**
    An alias to the proxied promise's `finally`.

    See RSVP.Promise.finally.

    @method finally
    @param {Function} callback
    @return {RSVP.Promise}
    @since 1.3.0
    @public
  */
  finally: promiseAlias('finally'),
});

function promiseAlias<T, N extends MethodNamesOf<Promise<T>>>(name: N) {
  return function (this: PromiseProxyMixin<T>, ...args: Parameters<Promise<T>[N]>) {
    let promise = get(this, 'promise');

    // We need this cast because `Parameters` is deferred so that it is not
    // possible for TS to see it will always produce the right type. However,
    // since `AnyFn` has a rest type, it is allowed. See discussion on [this
    // issue](https://github.com/microsoft/TypeScript/issues/47615).
    return (promise[name] as AnyFn)(...args);
  };
}

export default PromiseProxyMixin;
