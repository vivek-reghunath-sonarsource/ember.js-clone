import { schedule, join } from '@ember/runloop';
/**
@module ember
*/
import Container, { FactoryManager } from '@ember/-internals/container/lib/container';
import { TypeOptions } from '@ember/-internals/container/lib/registry';
import { Mixin } from '@ember/-internals/metal';
import { Factory } from '@ember/-internals/owner';

// This is defined as a separate interface so that it can be used in the definition of
// `Owner` without also including the `__container__` property.
export interface IContainer {
  ownerInjection(): void;
  lookup(fullName: string, options?: TypeOptions): Factory<object> | object | undefined;
  factoryFor(fullName: string): FactoryManager<object> | undefined;
}

/**
  ContainerProxyMixin is used to provide public access to specific
  container functionality.

  @class ContainerProxyMixin
  @private
*/
interface ContainerProxyMixin extends IContainer {
  /** @internal */
  __container__: Container;
}
const ContainerProxyMixin = Mixin.create({
  /**
   The container stores state.

   @private
   @property {Ember.Container} __container__
   */
  __container__: null,

  /**
   Returns an object that can be used to provide an owner to a
   manually created instance.

   Example:

   ```
   import { getOwner } from '@ember/application';

   let owner = getOwner(this);

   User.create(
     owner.ownerInjection(),
     { username: 'rwjblue' }
   )
   ```

   @public
   @method ownerInjection
   @since 2.3.0
   @return {Object}
  */
  ownerInjection() {
    return this.__container__.ownerInjection();
  },

  /**
   Given a fullName return a corresponding instance.

   The default behavior is for lookup to return a singleton instance.
   The singleton is scoped to the container, allowing multiple containers
   to all have their own locally scoped singletons.

   ```javascript
   let registry = new Registry();
   let container = registry.container();

   registry.register('api:twitter', Twitter);

   let twitter = container.lookup('api:twitter');

   twitter instanceof Twitter; // => true

   // by default the container will return singletons
   let twitter2 = container.lookup('api:twitter');
   twitter2 instanceof Twitter; // => true

   twitter === twitter2; //=> true
   ```

   If singletons are not wanted an optional flag can be provided at lookup.

   ```javascript
   let registry = new Registry();
   let container = registry.container();

   registry.register('api:twitter', Twitter);

   let twitter = container.lookup('api:twitter', { singleton: false });
   let twitter2 = container.lookup('api:twitter', { singleton: false });

   twitter === twitter2; //=> false
   ```

   @public
   @method lookup
   @param {String} fullName
   @param {Object} options
   @return {any}
   */
  lookup(fullName: string, options: object) {
    return this.__container__.lookup(fullName, options);
  },

  destroy() {
    let container = this.__container__;

    if (container) {
      join(() => {
        container.destroy();
        schedule('destroy', container, 'finalizeDestroy');
      });
    }

    this._super();
  },

  /**
 Given a fullName return a factory manager.

  This method returns a manager which can be used for introspection of the
  factory's class or for the creation of factory instances with initial
  properties. The manager is an object with the following properties:

  * `class` - The registered or resolved class.
  * `create` - A function that will create an instance of the class with
    any dependencies injected.

  For example:

  ```javascript
  import { getOwner } from '@ember/application';

  let owner = getOwner(otherInstance);
  // the owner is commonly the `applicationInstance`, and can be accessed via
  // an instance initializer.

  let factory = owner.factoryFor('service:bespoke');

  factory.class;
  // The registered or resolved class. For example when used with an Ember-CLI
  // app, this would be the default export from `app/services/bespoke.js`.

  let instance = factory.create({
    someProperty: 'an initial property value'
  });
  // Create an instance with any injections and the passed options as
  // initial properties.
  ```

  Any instances created via the factory's `.create()` method *must* be destroyed
  manually by the caller of `.create()`. Typically, this is done during the creating
  objects own `destroy` or `willDestroy` methods.

  @public
  @method factoryFor
  @param {String} fullName
  @param {Object} options
  @return {FactoryManager}
  */
  factoryFor(fullName: string) {
    return this.__container__.factoryFor(fullName);
  },
});

export default ContainerProxyMixin;
