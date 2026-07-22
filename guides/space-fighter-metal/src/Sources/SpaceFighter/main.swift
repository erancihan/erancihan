import AppKit
import Metal
import MetalKit

// Entry point. A SwiftPM executable runs the top-level code in `main.swift`, so
// we build the AppKit app by hand here — no storyboard, no app delegate — which
// keeps the whole program in plain sight. `swift run` launches it; chapter 01
// covers wrapping it in a proper `.app` bundle with Xcode.

guard let device = MTLCreateSystemDefaultDevice() else {
    fatalError("No Metal-capable GPU found. This project requires a Mac that supports Metal.")
}

let app = NSApplication.shared
app.setActivationPolicy(.regular)

// A minimal menu so ⌘Q works like any Mac app.
let mainMenu = NSMenu()
let appItem = NSMenuItem()
mainMenu.addItem(appItem)
let appMenu = NSMenu()
appMenu.addItem(withTitle: "Quit Space Fighter",
                action: #selector(NSApplication.terminate(_:)),
                keyEquivalent: "q")
appItem.submenu = appMenu
app.mainMenu = mainMenu

// Window + Metal view.
let contentRect = NSRect(x: 0, y: 0, width: 1280, height: 720)
let window = NSWindow(contentRect: contentRect,
                      styleMask: [.titled, .closable, .resizable, .miniaturizable],
                      backing: .buffered,
                      defer: false)
window.title = "Space Fighter"
window.center()

let mtkView = MTKView(frame: contentRect, device: device)
mtkView.preferredFramesPerSecond = 60
window.contentView = mtkView

guard let renderer = Renderer(view: mtkView) else {
    fatalError("Failed to initialise the Metal renderer (see console for shader/pipeline errors).")
}

let game = Game()
let input = InputController()
let coordinator = RenderCoordinator(game: game, renderer: renderer, input: input)
mtkView.delegate = coordinator   // MTKView holds this weakly; `coordinator` is retained below.

// Route keyboard events into the InputController. A local monitor is the
// simplest reliable way to read the keyboard without wrestling the responder
// chain. We consume the events we use (return nil) so macOS doesn't beep, but
// let anything with ⌘ through so system shortcuts keep working.
let keyMonitor = NSEvent.addLocalMonitorForEvents(matching: [.keyDown, .keyUp, .flagsChanged]) { event in
    switch event.type {
    case .keyDown:
        if event.keyCode == Key.escape { NSApp.terminate(nil) }
        if event.modifierFlags.contains(.command) { return event }
        input.keyDown(event.keyCode)
        return nil
    case .keyUp:
        if event.modifierFlags.contains(.command) { return event }
        input.keyUp(event.keyCode)
        return nil
    case .flagsChanged:
        input.setBoost(event.modifierFlags.contains(.shift))
        return event
    default:
        return event
    }
}

window.makeKeyAndOrderFront(nil)
app.activate(ignoringOtherApps: true)

// Keep strong references alive for the life of the process.
_ = coordinator
_ = keyMonitor

app.run()
