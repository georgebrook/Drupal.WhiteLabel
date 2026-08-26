<?php

namespace Drupal\twig_bem;

use Twig\Extension\AbstractExtension;
use Twig\Extension\ExtensionInterface;
use Twig\TwigFunction;

/**
 * Class BemTwigExtension
 *
 * @package Drupal\twig_bem
 */
// Implement ExtensionInterface and extend AbstractExtension
class BemTwigExtension extends AbstractExtension implements ExtensionInterface {

  public function getName() {
    return 'twig_bem_simple';
  }

  public function getFunctions() {
    return [
      // The function is marked 'is_safe' to allow the resulting string to render as HTML
      new TwigFunction('bem', [$this, 'bem'], ['is_safe' => ['html']]),
    ];
  }

  /*
   * Generates a string of BEM classes.
   * Signature: bem(base_class, modifiers, blockname, extra_classes)
   */
  public function bem($base_class, $modifiers = [], $blockname = '', $extra = []) {
    $classes = [];

    // Ensure array arguments for consistency
    if (!is_array($modifiers)) {
      $modifiers = [$modifiers];
    }
    if (!is_array($extra)) {
      $extra = [$extra];
    }
    
    // --- BEM LOGIC ---

    // If blockname is provided (The 'element' pattern: blockname__base_class)
    if ($blockname) {
      $classes[] = $blockname . '__' . $base_class;
      foreach ($modifiers as $modifier) {
        if (isset($modifier)) {
          $classes[] = $blockname . '__' . $base_class . '--' . $modifier;
        }
      }
    }
    // If no blockname is provided (The 'block' pattern: base_class)
    else {
      $classes[] = $base_class;
      foreach ($modifiers as $modifier) {
        if (isset($modifier)) {
          $classes[] = $base_class . '--' . $modifier;
        }
      }
    }
    
    // Add extra, non-BEM classes
    $classes = array_merge($classes, $extra);
    
    // Return a space-separated string of unique classes
    return implode(' ', array_unique($classes));
  }
}
