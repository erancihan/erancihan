# Offline speech-to-text model (voice input)

Voice input uses **sherpa-onnx** for fully-offline, no-API-key ASR. The model is
user-supplied and **not committed** (size/license) — like the Live2D runtime. Until one is
present, voice input is disabled and the 🎤 button reports it.

To enable:

1. Download a sherpa-onnx **offline** ASR model (e.g. Whisper tiny.en, Moonshine, or a
   transducer/paraformer model) from the sherpa-onnx model list
   (https://github.com/k2-fsa/sherpa-onnx/releases). Unpack its files into this folder.
2. Add a `config.json` here describing the model — the object passed to
   sherpa-onnx's `OfflineRecognizer`. File paths may be **bare names** relative to this
   folder; they're resolved automatically. Example for a Whisper model:

   ```json
   {
     "featConfig": { "sampleRate": 16000, "featureDim": 80 },
     "modelConfig": {
       "whisper": { "encoder": "tiny.en-encoder.onnx", "decoder": "tiny.en-decoder.onnx" },
       "tokens": "tiny.en-tokens.txt",
       "numThreads": 2,
       "provider": "cpu",
       "debug": false
     }
   }
   ```

3. Restart the app (or toggle 🎤). The mic captures ~16 kHz audio, an energy VAD segments
   utterances locally, and each is transcribed here and typed into the same `claude`
   session as the chat box. Speaking also **barges in** — it stops the avatar mid-sentence.

Audio never leaves the machine. No Anthropic key, no cloud ASR.

## Licensing

Verify each model's license before distributing. sherpa-onnx is Apache-2.0; individual
models carry their own terms.
