//! Negotiation Log Panel — scrollable table of negotiation events
//! with color-coded action badges and filtering.

use egui::{Color32, RichText, ScrollArea};

use crate::state::SimState;

/// Filter configuration for the log panel.
pub struct LogFilter {
    pub filter_text: String,
    pub show_offers: bool,
    pub show_counters: bool,
    pub show_accepted: bool,
    pub show_rejected: bool,
    pub show_timeout: bool,
    pub auto_scroll: bool,
}

impl Default for LogFilter {
    fn default() -> Self {
        Self {
            filter_text: String::new(),
            show_offers: true,
            show_counters: true,
            show_accepted: true,
            show_rejected: true,
            show_timeout: true,
            auto_scroll: true,
        }
    }
}

/// Render the negotiation log panel.
pub fn draw_logs(ui: &mut egui::Ui, state: &SimState, filter: &mut LogFilter) {
    // Filter controls
    ui.horizontal(|ui| {
        ui.label("🔍");
        ui.text_edit_singleline(&mut filter.filter_text);
        ui.separator();
        ui.checkbox(&mut filter.auto_scroll, "Auto-scroll");
    });

    ui.horizontal_wrapped(|ui| {
        action_toggle(ui, &mut filter.show_offers, "Offers", Color32::from_rgb(230, 180, 40));
        action_toggle(ui, &mut filter.show_counters, "Counters", Color32::from_rgb(200, 140, 30));
        action_toggle(ui, &mut filter.show_accepted, "Accepted", Color32::from_rgb(40, 200, 80));
        action_toggle(ui, &mut filter.show_rejected, "Rejected", Color32::from_rgb(200, 50, 50));
        action_toggle(ui, &mut filter.show_timeout, "Timeout", Color32::from_rgb(120, 120, 120));
    });

    ui.separator();

    // Table header
    egui::Grid::new("log_header")
        .num_columns(5)
        .spacing([12.0, 4.0])
        .striped(false)
        .show(ui, |ui| {
            ui.label(RichText::new("Tick").strong().color(Color32::from_rgb(140, 150, 170)));
            ui.label(RichText::new("Action").strong().color(Color32::from_rgb(140, 150, 170)));
            ui.label(RichText::new("From").strong().color(Color32::from_rgb(140, 150, 170)));
            ui.label(RichText::new("To").strong().color(Color32::from_rgb(140, 150, 170)));
            ui.label(RichText::new("Summary").strong().color(Color32::from_rgb(140, 150, 170)));
            ui.end_row();
        });

    // Scrollable event log
    let scroll = ScrollArea::vertical()
        .auto_shrink([false, false])
        .stick_to_bottom(filter.auto_scroll);

    scroll.show(ui, |ui| {
        egui::Grid::new("log_table")
            .num_columns(5)
            .spacing([12.0, 2.0])
            .striped(true)
            .show(ui, |ui| {
                for event in state.events.iter() {
                    // Apply action filter
                    let show = match event.action.as_str() {
                        "offer_made" => filter.show_offers,
                        "counter_offer" => filter.show_counters,
                        "accepted" => filter.show_accepted,
                        "rejected" => filter.show_rejected,
                        "timeout" => filter.show_timeout,
                        _ => true,
                    };
                    if !show {
                        continue;
                    }

                    // Apply text filter
                    if !filter.filter_text.is_empty() {
                        let text = filter.filter_text.to_lowercase();
                        let matches = event.summary.to_lowercase().contains(&text)
                            || event.action.to_lowercase().contains(&text)
                            || event.initiator_id.to_string().contains(&text)
                            || event.responder_id.to_string().contains(&text);
                        if !matches {
                            continue;
                        }
                    }

                    // Tick
                    ui.label(
                        RichText::new(format!("{}", event.tick))
                            .color(Color32::from_rgb(100, 110, 130))
                            .monospace(),
                    );

                    // Action badge
                    let (action_text, action_color) = match event.action.as_str() {
                        "offer_made" => ("OFFER", Color32::from_rgb(230, 180, 40)),
                        "counter_offer" => ("COUNTER", Color32::from_rgb(200, 140, 30)),
                        "accepted" => ("ACCEPT", Color32::from_rgb(40, 200, 80)),
                        "rejected" => ("REJECT", Color32::from_rgb(200, 50, 50)),
                        "timeout" => ("TIMEOUT", Color32::from_rgb(120, 120, 120)),
                        other => (other, Color32::from_rgb(150, 150, 150)),
                    };
                    ui.label(
                        RichText::new(action_text)
                            .color(action_color)
                            .strong()
                            .monospace(),
                    );

                    // Initiator
                    ui.label(
                        RichText::new(format!("#{}", event.initiator_id))
                            .color(Color32::from_rgb(130, 170, 220))
                            .monospace(),
                    );

                    // Responder
                    ui.label(
                        RichText::new(format!("#{}", event.responder_id))
                            .color(Color32::from_rgb(170, 130, 220))
                            .monospace(),
                    );

                    // Summary
                    ui.label(
                        RichText::new(&event.summary)
                            .color(Color32::from_rgb(180, 185, 195)),
                    );

                    ui.end_row();
                }
            });
    });
}

/// Helper: colored toggle button for action filtering.
fn action_toggle(ui: &mut egui::Ui, value: &mut bool, label: &str, color: Color32) {
    let text = if *value {
        RichText::new(label).color(color).strong()
    } else {
        RichText::new(label).color(Color32::from_rgb(80, 80, 80)).strikethrough()
    };
    if ui.selectable_label(*value, text).clicked() {
        *value = !*value;
    }
}
