//! World Statistics Panel — live metrics and charts.

use egui::{Color32, RichText};
use egui_plot::{Line, Plot, PlotPoints};

use crate::state::SimState;

/// Render the statistics panel with live metrics and charts.
pub fn draw_stats(ui: &mut egui::Ui, state: &SimState) {
    ui.horizontal(|ui| {
        // Connection status indicator
        let (status_icon, status_color, status_text) = if state.connected {
            ("●", Color32::from_rgb(40, 200, 80), "Connected")
        } else {
            ("●", Color32::from_rgb(200, 50, 50), "Disconnected")
        };
        ui.label(RichText::new(status_icon).color(status_color).size(14.0));
        ui.label(RichText::new(status_text).color(status_color));

        ui.separator();

        // Core metrics
        stat_badge(ui, "Tick", &format!("{}", state.current_tick), Color32::from_rgb(130, 170, 220));
        stat_badge(ui, "Time", &format!("{:.1}s", state.timestamp), Color32::from_rgb(130, 170, 220));
        stat_badge(ui, "Entities", &format!("{}", state.stats.total_entities), Color32::from_rgb(100, 200, 160));
        stat_badge(ui, "Active Neg.", &format!("{}", state.stats.active_negotiations), Color32::from_rgb(230, 180, 40));
        stat_badge(ui, "Completed", &format!("{}", state.stats.completed_negotiations), Color32::from_rgb(40, 200, 80));
        stat_badge(ui, "Timed Out", &format!("{}", state.stats.timed_out_negotiations), Color32::from_rgb(200, 50, 50));
        stat_badge(ui, "Stream FPS", &format!("{:.0}", state.stream_fps), Color32::from_rgb(160, 140, 220));
        stat_badge(ui, "Events", &format!("{}", state.events.len()), Color32::from_rgb(170, 130, 220));

        // Economy: total cash across all agents (a conserved quantity).
        let total_cash: f64 = state.entities.iter().map(|e| e.cash).sum();
        stat_badge(ui, "Total Cash", &format!("{total_cash:.0}"), Color32::from_rgb(120, 200, 120));

        // Observability metrics from the backend.
        if let Some(gini) = state.stats.metrics.get("wealth.gini") {
            stat_badge(ui, "Gini", &format!("{gini:.3}"), Color32::from_rgb(220, 150, 110));
        }
        if let Some(rate) = state.stats.metrics.get("economy.settlement_rate") {
            stat_badge(ui, "Settle %", &format!("{:.0}%", rate * 100.0), Color32::from_rgb(150, 200, 130));
        }
    });

    // Connection error
    if let Some(ref err) = state.connection_error {
        ui.colored_label(Color32::from_rgb(200, 50, 50), format!("⚠ {err}"));
    }

    ui.separator();

    // Negotiation activity chart
    if !state.negotiation_history.is_empty() {
        let points: PlotPoints = state
            .negotiation_history
            .iter()
            .map(|&(t, v)| [t, v])
            .collect();

        let line = Line::new(points)
            .color(Color32::from_rgb(230, 180, 40))
            .name("Active Negotiations");

        Plot::new("negotiation_chart")
            .height(100.0)
            .show_axes([true, true])
            .allow_drag(false)
            .allow_zoom(false)
            .include_y(0.0)
            .show(ui, |plot_ui| {
                plot_ui.line(line);
            });
    }
}

/// Helper: render a compact stat badge with label and value.
fn stat_badge(ui: &mut egui::Ui, label: &str, value: &str, color: Color32) {
    ui.label(RichText::new(label).color(Color32::from_rgb(100, 110, 130)).small());
    ui.label(RichText::new(value).color(color).strong().monospace());
    ui.add_space(4.0);
}
