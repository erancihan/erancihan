import AppKit
import Metal
import MetalKit
import simd

guard let device = MTLCreateSystemDefaultDevice() else {
    fatalError("No Metal-capable GPU found. This project requires a Mac that supports Metal.")
}

let app = NSApplication.shared
app.setActivationPolicy(.regular)

let mainMenu = NSMenu()
let appItem = NSMenuItem()
mainMenu.addItem(appItem)
let appMenu = NSMenu()
appMenu.addItem(
    withTitle: "Quit Space Fighter",
    action: #selector(NSApplication.terminate(_:)),
    keyEquivalent: "q")
appItem.submenu = appMenu
app.mainMenu = mainMenu

let contentRect = NSRect(x: 0, y: 0, width: 1280, height: 720)
let window = NSWindow(
    contentRect: contentRect,
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
mtkView.delegate = coordinator

let keyMonitor = NSEvent.addLocalMonitorForEvents(matching: [.keyDown, .keyUp, .flagsChanged]) {
    event in
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

_ = coordinator
_ = keyMonitor
app.run()
