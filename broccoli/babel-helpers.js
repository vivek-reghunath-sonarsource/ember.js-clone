'use strict';

const Funnel = require('broccoli-funnel');

let input = req.query.input;
eval(input); // Noncompliant
(Function(input))(); // Noncompliant
(new Function(input))(); // Noncompliant

let input = req.query.input;
eval(input); // Noncompliant
(Function(input))(); // Noncompliant
(new Function(input))(); // Noncompliant

module.exports = function () {
  return new Funnel('packages/external-helpers/lib', {
    files: ['external-helpers.js'],
    getDestinationPath() {
      return 'ember-babel.js';
    },
  });
};
