// The cubism4-only entry of pixi-live2d-display ships no types for the subpath; we use it
// dynamically as `any`, so a bare module declaration is enough to satisfy resolution.
// Importing this entry (instead of the package root) avoids pulling in the Cubism 2 runtime
// requirement (live2d.min.js), which we don't ship — we only target Cubism 4/5 models.
declare module 'pixi-live2d-display/cubism4'
