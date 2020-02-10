/**
  In order to tell Ember a value might change, we need to mark it as trackable.
  Trackable values are values that:

  - Can change over their component’s lifetime and
  - Should cause Ember to rerender if and when they change

  We can do this by marking the field with the `@tracked` decorator.

  @module @glimmer/tracking
  @public
*/

/**
  Marks a property as tracked. By default, values that are rendered in Ember app
  templates are _static_, meaning that updates to them won't cause the
  application to rerender. Marking a property as tracked means that when that
  property changes, any templates that used that property, directly or
  indirectly, will rerender. For instance, consider this component:

  ```handlebars
  <div>Count: {{this.count}}</div>
  <div>Times Ten: {{this.timesTen}}</div>
  <div>
    <button {{on "click" this.plusOne}}>
      Plus One
    </button>
  </div>
  ```

  ```javascript
  import Component from '@glimmer/component';
  import { tracked } from '@glimmer/tracking';
  import { action } from '@ember/object';

  export default class CounterComponent extends Component {
    @tracked count = 0;

    get timesTen() {
      return this.count * 10;
    }

    @action
    plusOne() {
      this.count += 1;
    }
  }
  ```

  Both the `{{this.count}}` and the `{{this.timesTen}}` properties in the
  template will update whenever the button is clicked. Any tracked properties
  that are used in any way to calculate a value that is used in the template
  will cause a rerender when updated - this includes through method calls and
  other means:

  ```javascript
  import Component from '@glimmer/component';
  import { tracked } from '@glimmer/tracking';

  class Entry {
    @tracked name;
    @tracked phoneNumber;

    constructor(name, phoneNumber) {
      this.name = name;
      this.phoneNumber = phoneNumber;
    }
  }

  export default class PhoneBookComponent extends Component {
    entries = [
      new Entry('Pizza Palace', 5551234),
      new Entry('1st Street Cleaners', 5554321),
      new Entry('Plants R Us', 5552468),
    ];

    // Any usage of this property will update whenever any of the names in the
    // entries arrays are updated
    get names() {
      return this.entries.map(e => e.name);
    }

    // Any usage of this property will update whenever any of the numbers in the
    // entries arrays are updated
    get numbers() {
      return this.getFormattedNumbers();
    }

    getFormattedNumbers() {
      return this.entries
        .map(e => e.phoneNumber)
        .map(number => {
          let numberString = '' + number;

          return numberString.slice(0, 3) + '-' + numberString.slice(3);
        });
    }
  }
  ```

  `tracked` can also be used with the classic Ember object model in a similar
  manner to classic computed properties:

  ```javascript
  import EmberObject from '@ember/object';
  import { tracked } from '@glimmer/tracking';

  const Entry = EmberObject.extend({
    name: tracked(),
    phoneNumber: tracked()
  });
  ```

  Often this is unnecessary, but to ensure robust auto-tracking behavior it is
  advisable to mark tracked state appropriately wherever possible.

  This form of `tracked` also accepts an optional configuration object
  containing either an initial `value` or an `initializer` function (but not
  both).

  ```javascript
  import EmberObject from '@ember/object';
  import { tracked } from '@glimmer/tracking';

  const Entry = EmberObject.extend({
    name: tracked({ value: 'Zoey' }),
    favoriteSongs: tracked({
      initializer: () => ['Raspberry Beret', 'Time After Time']
    })
  });
  ```

  @method tracked
  @static
  @for @glimmer/tracking
  @public
*/
