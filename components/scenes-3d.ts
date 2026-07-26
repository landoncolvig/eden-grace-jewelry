'use client';

/**
 * The single lazy entry point for everything that needs a renderer.
 *
 * Both pieces are reached through this one module rather than imported
 * directly, and that is load-bearing. Two `dynamic(() => import(...))` calls
 * pointing at two different modules produce two async chunks, and since three
 * and drei are the overwhelming majority of both, the bundler wrote out the
 * renderer twice: 948 KB each, 1.9 MB deployed, and a second full download the
 * moment a page showed both pieces. Pointing both at this file collapses them
 * onto one chunk that the browser fetches once and reuses.
 *
 * The scenes stay in their own files. This is a manifest, not a container.
 */

export { default as Necklace3D } from './necklace-3d';
export { default as Strand3D } from './strand-3d';
