# 14 · Caching the compiled shaders 🛠️

> **You'll leave this chapter with:** a game that compiles its pipelines once on
> the machine it runs on and never again — startup shader work down from ~50 ms
> to under 1 ms — plus a cache that repairs itself when it goes bad.
>
> **Files created:** `Sources/SpaceFighter/Render/RHI/PipelineCache.swift`
> **Files changed:** `Render/RHI/Pipelines.swift`, `Render/Renderer.swift`

Chapter 13 finished the game. This chapter fixes something that has been true
since chapter 08 and is easy not to notice: **every launch recompiles work the
last launch already did.**

That's not a performance nicety, it's a correctness-of-attitude problem. Asking
every player to burn the same cycles on the same GPU producing the same bytes,
every time they start the game, is the kind of waste programming exists to
delete.

---

## Measure it first

Before fixing anything, find out what you're actually paying for. Two separate
compilations happen at launch, and they behave very differently.

Add temporary timing to `Renderer.init` — the crude kind, deleted at the end of
the section:

```swift
let t0 = DispatchTime.now().uptimeNanoseconds
let library = try ShaderLibrary.make(device: rhi.device)
let t1 = DispatchTime.now().uptimeNanoseconds
let pipelines = Pipelines(device: rhi.device, view: view, library: library)
let t2 = DispatchTime.now().uptimeNanoseconds
print("library \((t1 - t0) / 1_000_000) ms, pipelines \((t2 - t1) / 1_000_000) ms")
```

Run it three times. On an M1 Max, this project:

```console
$ swift run          # first ever run
library 95 ms, pipelines 29 ms
$ swift run
library 1 ms, pipelines 37 ms
$ swift run
library 1 ms, pipelines 36 ms
```

Read those numbers carefully, because they say something non-obvious.

**The library compile fixed itself.** 95 ms the first time, ~1 ms forever after.
Nobody wrote that cache — macOS keeps a system-level shader cache keyed on source
content, and `makeLibrary(source:)` hits it. Edit any `.metal` file and the next
run pays 70–95 ms again, then drops back. Stage one is already handled, for free.

**The pipeline compile did not.** 36 ms, every launch, forever. Delete nothing,
change nothing, run it a hundred times — you pay it a hundred times.

That asymmetry is the whole chapter. To see why it exists, you need the two
stages.

---

## Two compilations, only one of which is yours

| | Stage 1 | Stage 2 |
|---|---|---|
| Turns | MSL source → AIR (Apple's IR) | AIR → machine code for *this* GPU |
| Called by | `makeLibrary(source:)` | `makeRenderPipelineState(descriptor:)` |
| Depends on | the source text | source **and** the whole pipeline descriptor |
| Cached by macOS | yes | no |

Stage 2 needs more than the shaders. It needs the pixel formats, the blend mode,
the depth format, the sample count — everything in the descriptor
`Pipelines.init` fills in. That combination is called a **pipeline state object**,
a PSO, and the machine code is specific to your exact GPU and driver, which is
why it cannot be produced at build time by anyone, including Apple.

So the system can't cache it for you, because "the same shader" isn't the
question — "the same shader in the same pipeline configuration on this driver"
is. If you want that saved, you save it.

This is also exactly what the "Compiling shaders…" screen in a modern game is
doing, and why it comes back after a GPU driver update. You have four pipelines
where a large game has tens of thousands; the mechanism is identical.

---

## `MTLBinaryArchive`

Metal's answer is a serializable container of compiled PSOs. Three operations:

- `addRenderPipelineFunctions(descriptor:)` — compile this descriptor into me
- `serialize(to:)` — write me to disk
- `descriptor.binaryArchives = [archive]` — when creating a pipeline, look here first

Plus one option that turns a silent fallback into an answerable question:
`makeRenderPipelineState(descriptor:options:reflection:)` with
`.failOnBinaryArchiveMiss` **throws** instead of quietly compiling, which is how
you tell a hit from a miss.

**`Sources/SpaceFighter/Render/RHI/PipelineCache.swift`** — new file:

```swift
import Foundation
import Metal

/// Persists compiled pipeline states between launches, so the GPU compiles each
/// one once per machine rather than once per run.
final class PipelineCache {
    private let device: MTLDevice
    private let url: URL
    private let archive: MTLBinaryArchive?
    private var pending = 0

    init(device: MTLDevice, name: String = "SpaceFighter") {
        self.device = device
        let directory = FileManager.default
            .urls(for: .cachesDirectory, in: .userDomainMask)[0]
            .appending(path: name)
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        self.url = directory.appending(path: "pipelines.metallib")
        self.archive = PipelineCache.open(device: device, url: url)
    }
}
```

`.cachesDirectory` is the correct home and not an arbitrary one. It means "I can
regenerate this" — the OS is allowed to delete it under disk pressure, it isn't
backed up, and nothing breaks if it vanishes. A cache that would be a disaster to
lose is not a cache.

The archive is optional throughout. Every failure in this file degrades to
"compile like chapter 08 did", never to a crash.

### Opening, and surviving a bad file

**`PipelineCache.swift`**, in `PipelineCache` — after `init`:

```diff
         self.archive = PipelineCache.open(device: device, url: url)
     }
+
+    private static func open(device: MTLDevice, url: URL) -> MTLBinaryArchive? {
+        let descriptor = MTLBinaryArchiveDescriptor()
+        if FileManager.default.fileExists(atPath: url.path) {
+            descriptor.url = url
+        }
+        do {
+            return try device.makeBinaryArchive(descriptor: descriptor)
+        } catch {
+            // Corrupt, truncated, or written by an incompatible OS. Bin it.
+            try? FileManager.default.removeItem(at: url)
+            descriptor.url = nil
+            return try? device.makeBinaryArchive(descriptor: descriptor)
+        }
+    }
 }
```

That `catch` is not defensive padding — it is the difference between a cache and
a bug that bricks the game. Hand `makeBinaryArchive` a damaged file and it throws:

```
Error Domain=MTLBinaryArchiveDomain Code=1 "The file …/pipelines.metallib
has an invalid format."
```

Let that propagate and every launch fails, permanently, because the bad file is
still there next time. And a truncated archive is not hypothetical: the player
force-quits, the machine loses power, or the disk fills while you're serializing.
Deleting the file and continuing without it turns a permanent failure into one
slow launch.

### Getting a pipeline

**`PipelineCache.swift`**, in `PipelineCache` — after `open`:

```diff
             return try? device.makeBinaryArchive(descriptor: descriptor)
         }
     }
+
+    /// A pipeline state for `descriptor` — from the cache if it's there,
+    /// compiled and recorded if it isn't.
+    func makePipeline(_ descriptor: MTLRenderPipelineDescriptor) -> MTLRenderPipelineState? {
+        guard let archive else {
+            return try? device.makeRenderPipelineState(descriptor: descriptor)
+        }
+        descriptor.binaryArchives = [archive]
+
+        if let cached = try? device.makeRenderPipelineState(
+            descriptor: descriptor, options: .failOnBinaryArchiveMiss, reflection: nil) {
+            return cached
+        }
+
+        try? archive.addRenderPipelineFunctions(descriptor: descriptor)
+        pending += 1
+        return try? device.makeRenderPipelineState(descriptor: descriptor)
+    }
 }
```

Read the miss path: record the descriptor into the archive, then compile normally
and hand the state back. The player waits exactly as long as they did in chapter
08 — the archive costs nothing on a miss and saves everything on the next launch.

`.failOnBinaryArchiveMiss` is doing real work here. Without it, a miss silently
compiles and returns a valid state, `pending` never increments, and you'd ship a
cache that is never written and never wrong-looking. Making the miss *loud* is
what makes the next line possible.

### Writing it back, without the chance of a half-file

**`PipelineCache.swift`**, in `PipelineCache` — after `makePipeline`:

```diff
         return try? device.makeRenderPipelineState(descriptor: descriptor)
     }
+
+    /// Persist anything compiled this launch. Call once, after all pipelines
+    /// exist.
+    func flush() {
+        guard let archive, pending > 0 else { return }
+        pending = 0
+        let temporary = url.deletingLastPathComponent()
+            .appending(path: "pipelines-\(UUID().uuidString).tmp")
+        do {
+            try archive.serialize(to: temporary)
+            _ = try FileManager.default.replaceItemAt(url, withItemAt: temporary)
+        } catch {
+            try? FileManager.default.removeItem(at: temporary)
+        }
+    }
 }
```

Two details, both load-bearing.

**`pending > 0`** means a launch that hit on everything writes nothing at all.
Serializing takes 12–23 ms in this project; doing it on every launch would hand
back a third of what the cache just saved, to rewrite bytes that are already
identical.

**Serialize to a temporary, then `replaceItemAt`.** `serialize(to:)` is not
atomic. Write straight to the real path, get killed halfway, and you've created
precisely the corrupt file the previous section had to defend against — and
you've done it to yourself, on the good path. Writing to a scratch name and
swapping means the real file is only ever the old complete one or the new
complete one.

---

## Wiring it in

Two small changes, both diffs against chapter 08.

**`Render/RHI/Pipelines.swift`**, in `init` — take a cache and build through it:

```diff
-    init?(device: MTLDevice, view: MTKView, library: MTLLibrary) {
+    init?(device: MTLDevice, view: MTKView, library: MTLLibrary, cache: PipelineCache) {
         func pipeline(_ vfn: String, _ ffn: String, blend: BlendMode) -> MTLRenderPipelineState? {
             let d = MTLRenderPipelineDescriptor()
             d.vertexFunction = library.makeFunction(name: vfn)
             d.fragmentFunction = library.makeFunction(name: ffn)
             d.colorAttachments[0].pixelFormat = view.colorPixelFormat
             d.depthAttachmentPixelFormat = view.depthStencilPixelFormat
             blend.apply(to: d.colorAttachments[0])
-            return try? device.makeRenderPipelineState(descriptor: d)
+            return cache.makePipeline(d)
         }
```

One line changes inside the nested function, and the four `guard` bindings below
it are untouched. That is chapter 08's split paying off: because every
`makeRenderPipelineState` call in the project was already funnelled through one
nested helper in one initializer, there is exactly one place to intercept. Had
those four calls been scattered through `Renderer.init`, this would be a
four-site change with a fifth waiting to be forgotten.

**`Render/Renderer.swift`**, in `init` — create the cache, flush after:

```diff
-        guard let pipelines = Pipelines(device: rhi.device, view: view, library: library)
+        let cache = PipelineCache(device: rhi.device)
+        guard let pipelines = Pipelines(device: rhi.device, view: view, library: library, cache: cache)
         else { return nil }
+        cache.flush()
 
         self.rhi = rhi
```

`flush` after the `guard`, so a launch that failed to build its pipelines never
writes a cache describing them.

The cache is a local, not a stored property. Once the four states exist it has no
further job this run — and keeping it alive would mean keeping the archive alive,
which is memory holding compiled code you've already got.

---

## Checkpoint

Run three times, then look at the cache:

```console
$ rm -rf ~/Library/Caches/SpaceFighter
$ swift run
library 2 ms, pipelines 49 ms       # cold: four misses, then serialize
$ swift run
library 1 ms, pipelines 0 ms        # four hits
$ swift run
library 1 ms, pipelines 0 ms
$ ls -la ~/Library/Caches/SpaceFighter
-rw-r--r--  1 you  staff  115260  pipelines.metallib
```

49 ms down to 0.7 ms — roughly **70×** off the one piece of startup work that
used to repeat on every single launch. 115 KB of disk for four pipelines.

Now prove the repair path works, because a cache you can't corrupt on purpose is
a cache you haven't tested:

```console
$ echo garbage > ~/Library/Caches/SpaceFighter/pipelines.metallib
$ swift run
library 1 ms, pipelines 37 ms       # noticed, deleted, rebuilt — no crash
$ swift run
library 1 ms, pipelines 0 ms        # healthy again
```

**When it doesn't work:**

- **Pipelines still cost 30+ ms on the second run.** `flush()` isn't being
  reached, or it's before the `guard`. Check that `pending` is incrementing —
  if it's 0 after a cold run, `.failOnBinaryArchiveMiss` is missing from the
  `options:` argument and every miss is passing silently.
- **`invalid format` crashes the app** rather than being swallowed. The `catch`
  in `open` is using `try` where it needs `try?`, or the delete is missing so the
  bad file survives into the next launch.
- **The cache file never appears.** `.cachesDirectory` returned a path you can't
  write to; the `createDirectory` call is `try?` so it fails silently by design.
  Print `url` once to check.
- **Second run is fast, but a `.metal` edit doesn't take effect.** It does — but
  confirm by editing a colour constant, not whitespace. A trailing comment
  produces identical AIR, so the archive legitimately still hits.

---

## What this does and doesn't buy you

It removes stage 2 from every launch after the first. That was the part nothing
else was going to cover.

It does **not** remove stage 1 — `makeLibrary(source:)` still runs, and still
pays 70–95 ms whenever you edit a shader. The system cache absorbs that for
players, who never edit shaders, so it costs you during development and costs
them once. If you want it gone properly, that's the `.metallib` route in chapter
15: compile at build time and load with `makeDefaultLibrary(bundle:)`, at which
point stage 1 becomes a file read and this cache handles everything that's left.
The two fit together — an archive built against a `.metallib` works the same way.

Worth knowing where this stops scaling. At four pipelines you can compile
everything up front and the player never sees it. At thousands, up-front
compilation *is* the loading screen, and the next tools are
`makeRenderPipelineState(descriptor:completionHandler:)` to compile
asynchronously across cores while showing progress, and **function constants**
(`[[function_constant(n)]]` with `MTLFunctionConstantValues`) to cut how many
distinct pipelines exist in the first place. Same mechanism, more machinery
around it.

---

## Challenge

The cache never notices a *stale* entry. Change a blend mode in chapter 08 and
the descriptor changes, so you get a legitimate miss and a fresh compile — but
the old entry stays in the archive forever, and the file only grows.

Add a version stamp: write a small sidecar file next to the archive holding
something that identifies this build (`device.name`, the OS version, and a
constant you bump by hand will do), compare it on open, and throw the archive
away wholesale when it doesn't match. Two questions to answer while you do it.
What *should* be in that stamp — what changes invalidate compiled machine code,
and what changes don't? And what happens on a machine with two GPUs, where the
user drags the window from one display to another?

---

**Next:** from prototype to real game — the roadmap. →
[Chapter 15: Where to go next](15-where-to-go-next.md)
