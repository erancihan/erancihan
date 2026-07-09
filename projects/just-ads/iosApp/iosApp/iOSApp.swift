import SwiftUI
import ComposeApp

@main
struct iOSApp: App {
    var body: some Scene {
        WindowGroup {
            ComposeView()
                .ignoresSafeArea(.all)
        }
    }
}

/// Hosts the shared Compose UI, injecting the Swift-backed ad loader (PLAN.md §5.3).
struct ComposeView: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> UIViewController {
        MainViewControllerKt.MainViewController(loader: AdsBridgeIos())
    }

    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {}
}
