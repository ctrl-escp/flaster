/**
 * Matchers for HTMLCanvasElement and CanvasRenderingContext2D API accesses.
 */

import {matcher as canvasGetContext} from './canvas-get-context.js';
import {matcher as canvasToDataUrl} from './canvas-to-data-url.js';
import {matcher as canvasGetImageData} from './canvas-get-image-data.js';

export const canvasMatchers = Object.freeze({
  'canvas-get-context': canvasGetContext,
  'canvas-to-data-url': canvasToDataUrl,
  'canvas-get-image-data': canvasGetImageData,
});
