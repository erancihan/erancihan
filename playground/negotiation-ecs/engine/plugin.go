package engine

// Plugin bundles a feature's components, resources, and systems and registers
// them onto an App. Movement, economy, and negotiation are each expressed as
// plugins so features compose without the core knowing about them.
type Plugin interface {
	Build(*App)
}

// PluginFunc adapts a plain function into a Plugin.
type PluginFunc func(*App)

// Build implements Plugin.
func (f PluginFunc) Build(a *App) { f(a) }
