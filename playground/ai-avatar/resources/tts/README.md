# Offline neural TTS voice (real lip-sync)

When a TTS voice is installed here, assistant replies are synthesized to audio with
**sherpa-onnx** and played in the app, driving **real audio-amplitude lip-sync** (the
avatar's mouth follows the actual waveform). Without it, the app falls back to the browser
Web Speech API (still no key; flap-based mouth). The voice model is user-supplied and
**not committed** (size/license), like the ASR and Live2D assets.

To enable:

1. Download a sherpa-onnx **offline TTS** voice (e.g. a Piper/VITS or Kokoro voice) from the
   sherpa-onnx releases (https://github.com/k2-fsa/sherpa-onnx/releases). Unpack into this
   folder.
2. Add a `config.json` describing it — the object passed to sherpa-onnx's `OfflineTts`.
   Paths may be bare names relative to this folder (resolved automatically). Example for a
   VITS/Piper voice:

   ```json
   {
     "model": {
       "vits": {
         "model": "en_US-amy-low.onnx",
         "tokens": "tokens.txt",
         "dataDir": "espeak-ng-data"
       },
       "numThreads": 2,
       "provider": "cpu",
       "debug": false
     }
   }
   ```

3. Turn on 🔊. Replies are synthesized locally and lip-synced from amplitude. Everything
   stays on the machine — no API key, no cloud TTS.

## Licensing

Verify each voice's license before distributing. sherpa-onnx is Apache-2.0; voices carry
their own terms.
