/**
 * @file
 * Global theme JS file
 * Use this for anything thats global to the site.
 */

(function (Drupal, once) {
  "use strict";

  Drupal.behaviors.logContext = {
    attach: (context, settings) => {
      once("logContext", "body", context).forEach((element) => {
        console.log("Drupal behavior context:", context);
        console.log("Settings:", settings);
        console.log("Element:", element);
      });
    },
  };
})(Drupal, once);
