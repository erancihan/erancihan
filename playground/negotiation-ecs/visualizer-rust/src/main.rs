//! Multi-Agent Negotiation Simulator — Real-Time Visualizer
//!
//! A native egui/eframe application that connects to the Go backend
//! via gRPC and provides a dual-panel visualization dashboard:
//!   - Left: 2D agent canvas with position rendering and negotiation lines
//!   - Right: Scrollable negotiation event log with filtering
//!   - Top: Live world statistics and connection status

mod network;
mod state;
mod ui;

use std::sync::{Arc, Mutex};

use clap::Parser;
use eframe::egui;

use state::SimState;
use ui::canvas::{self, CanvasConfig};
use ui::logs::{self, LogFilter};
use ui::stats;

/// CLI arguments for the visualizer.
#[derive(Parser, Debug)]
#[command(name = "negotiation-visualizer")]
#[command(about = "Real-time visualizer for ECS Multi-Agent Negotiation Simulator")]
struct Args {
    /// gRPC server address to connect to.
    #[arg(short, long, default_value = "localhost:50051")]
    server: String,
}

/// Main application state.
struct NegotiationApp {
    /// Shared simulation state (written by network thread, read by UI).
    sim_state: Arc<Mutex<SimState>>,

    /// Canvas rendering configuration.
    canvas_config: CanvasConfig,

    /// Log panel filter state.
    log_filter: LogFilter,
}

impl NegotiationApp {
    fn new(cc: &eframe::CreationContext<'_>, server_addr: String) -> Self {
        // Configure dark theme with custom styling
        let mut style = (*cc.egui_ctx.style()).clone();
        style.visuals = egui::Visuals::dark();
        style.visuals.panel_fill = egui::Color32::from_rgb(18, 20, 26);
        cc.egui_ctx.set_style(style);

        let sim_state = Arc::new(Mutex::new(SimState::new()));

        // Spawn the background gRPC receiver thread
        network::spawn_network_thread(Arc::clone(&sim_state), server_addr);

        Self {
            sim_state,
            canvas_config: CanvasConfig::default(),
            log_filter: LogFilter::default(),
        }
    }
}

impl eframe::App for NegotiationApp {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        // Request continuous repainting for real-time visualization
        ctx.request_repaint_after(std::time::Duration::from_millis(16)); // ~60 FPS

        // Lock state once per frame and clone what we need
        let state = {
            let lock = self.sim_state.lock().unwrap();
            lock.clone_for_ui()
        };

        // Top panel: Statistics bar
        egui::TopBottomPanel::top("stats_panel")
            .min_height(40.0)
            .show(ctx, |ui| {
                ui.add_space(4.0);
                stats::draw_stats(ui, &state);
                ui.add_space(4.0);
            });

        // Right panel: Negotiation logs
        egui::SidePanel::right("log_panel")
            .min_width(400.0)
            .default_width(500.0)
            .resizable(true)
            .show(ctx, |ui| {
                ui.heading(
                    egui::RichText::new("📋 Negotiation Log")
                        .color(egui::Color32::from_rgb(200, 205, 215)),
                );
                ui.separator();
                logs::draw_logs(ui, &state, &mut self.log_filter);
            });

        // Central panel: 2D Canvas
        egui::CentralPanel::default().show(ctx, |ui| {
            ui.heading(
                egui::RichText::new("🌐 Agent World")
                    .color(egui::Color32::from_rgb(200, 205, 215)),
            );

            // Legend
            ui.horizontal(|ui| {
                legend_dot(ui, "Idle", egui::Color32::from_rgb(70, 130, 200));
                legend_dot(ui, "Offering", egui::Color32::from_rgb(230, 180, 40));
                legend_dot(ui, "Accepted", egui::Color32::from_rgb(40, 200, 80));
                legend_dot(ui, "Rejected", egui::Color32::from_rgb(200, 50, 50));
                legend_dot(ui, "Timeout", egui::Color32::from_rgb(120, 120, 120));
            });

            ui.separator();
            canvas::draw_canvas(ui, &state, &self.canvas_config);
        });
    }
}

/// Helper: render a colored legend dot with label.
fn legend_dot(ui: &mut egui::Ui, label: &str, color: egui::Color32) {
    ui.label(egui::RichText::new("●").color(color));
    ui.label(egui::RichText::new(label).color(egui::Color32::from_rgb(140, 150, 170)).small());
    ui.add_space(8.0);
}

fn main() -> eframe::Result {
    let args = Args::parse();

    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size([1400.0, 900.0])
            .with_title("Negotiation Simulator — Visualizer"),
        ..Default::default()
    };

    eframe::run_native(
        "Negotiation Visualizer",
        options,
        Box::new(move |cc| Ok(Box::new(NegotiationApp::new(cc, args.server)))),
    )
}
