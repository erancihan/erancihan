# Live2D Cubism Core runtime

The Live2D Cubism **Core** (`live2dcubismcore.min.js`) is required to render real `.moc3`
models. It is proprietary and **not redistributed in this repo**, so it is not committed
here.

`npm install` (postinstall) fetches the Cubism Core here automatically when missing — or
run `npm run fetch-avatar`. To do it manually instead:

1. Download the Cubism SDK for Web from Live2D
   (https://www.live2d.com/en/sdk/download/web/) and accept its license.
2. Copy `live2dcubismcore.min.js` into this folder.
3. Load it before the avatar mounts (e.g. add a `<script>` tag to
   `src/renderer/index.html`, or import it as a side-effect). `Live2DController` checks
   `window.Live2DCubismCore` and throws a clear error if it's missing — in which case the
   app falls back to the built-in placeholder companion.

## Licensing

The Cubism SDK is free to develop with. A paid Publication License applies only to
distribution above ¥10M (~$67k) annual sales; individuals/small projects are exempt.
Review the current terms before distributing.
