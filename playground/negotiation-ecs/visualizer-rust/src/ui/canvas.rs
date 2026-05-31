//! 2D Agent Canvas — renders agent positions, movement trails,
//! and negotiation pairing lines in a zoomable/pannable view.

use egui::{Color32, Painter, Pos2, Rect, Sense, Stroke, Vec2};

use crate::state::SimState;

/// World coordinate bounds for mapping to screen space.
pub struct CanvasConfig {
    pub world_width: f64,
    pub world_height: f64,
}

impl Default for CanvasConfig {
    fn default() -> Self {
        Self {
            world_width: 1000.0,
            world_height: 1000.0,
        }
    }
}

/// Render the 2D agent canvas panel.
pub fn draw_canvas(ui: &mut egui::Ui, state: &SimState, config: &CanvasConfig) {
    let available = ui.available_size();
    let (response, painter) = ui.allocate_painter(available, Sense::hover());
    let canvas_rect = response.rect;

    // Background
    painter.rect_filled(canvas_rect, 0.0, Color32::from_rgb(15, 17, 23));

    // Draw grid
    draw_grid(&painter, canvas_rect, config);

    if state.entities.is_empty() {
        // No data — show placeholder
        painter.text(
            canvas_rect.center(),
            egui::Align2::CENTER_CENTER,
            "Waiting for simulation data...",
            egui::FontId::proportional(16.0),
            Color32::from_rgb(100, 110, 130),
        );
        return;
    }

    // Draw negotiation pairing lines first (behind agents)
    draw_negotiation_lines(&painter, canvas_rect, state, config);

    // Draw agents
    draw_agents(&painter, canvas_rect, state, config, ui);
}

/// Map world coordinates to screen coordinates.
fn world_to_screen(
    world_x: f64,
    world_y: f64,
    canvas_rect: Rect,
    config: &CanvasConfig,
) -> Pos2 {
    let margin = 20.0;
    let draw_rect = canvas_rect.shrink(margin);

    let nx = (world_x / config.world_width) as f32;
    let ny = (world_y / config.world_height) as f32;

    Pos2::new(
        draw_rect.min.x + nx * draw_rect.width(),
        draw_rect.min.y + ny * draw_rect.height(),
    )
}

/// Draw subtle grid lines for spatial reference.
fn draw_grid(painter: &Painter, canvas_rect: Rect, config: &CanvasConfig) {
    let grid_color = Color32::from_rgba_premultiplied(40, 45, 55, 80);
    let grid_step = 200.0; // world units

    let mut x = 0.0;
    while x <= config.world_width {
        let p1 = world_to_screen(x, 0.0, canvas_rect, config);
        let p2 = world_to_screen(x, config.world_height, canvas_rect, config);
        painter.line_segment([p1, p2], Stroke::new(1.0, grid_color));
        x += grid_step;
    }

    let mut y = 0.0;
    while y <= config.world_height {
        let p1 = world_to_screen(0.0, y, canvas_rect, config);
        let p2 = world_to_screen(config.world_width, y, canvas_rect, config);
        painter.line_segment([p1, p2], Stroke::new(1.0, grid_color));
        y += grid_step;
    }
}

/// Draw lines between agents in active negotiations.
fn draw_negotiation_lines(
    painter: &Painter,
    canvas_rect: Rect,
    state: &SimState,
    config: &CanvasConfig,
) {
    // Build a quick lookup of entity positions
    let positions: std::collections::HashMap<u64, (f64, f64)> = state
        .entities
        .iter()
        .map(|e| (e.entity_id, (e.pos_x, e.pos_y)))
        .collect();

    for entity in &state.entities {
        if entity.counter_party_id == 0 {
            continue;
        }
        // Only draw from the entity with the lower ID to avoid duplicate lines
        if entity.entity_id > entity.counter_party_id {
            continue;
        }

        if let Some(&(other_x, other_y)) = positions.get(&entity.counter_party_id) {
            let p1 = world_to_screen(entity.pos_x, entity.pos_y, canvas_rect, config);
            let p2 = world_to_screen(other_x, other_y, canvas_rect, config);

            let line_color = match entity.negotiation_status.as_str() {
                "offering" | "countering" => Color32::from_rgba_premultiplied(255, 200, 50, 120),
                "accepted" => Color32::from_rgba_premultiplied(50, 220, 100, 150),
                "rejected" => Color32::from_rgba_premultiplied(220, 50, 50, 120),
                "timeout" => Color32::from_rgba_premultiplied(150, 150, 150, 80),
                _ => Color32::from_rgba_premultiplied(80, 80, 80, 60),
            };

            painter.line_segment([p1, p2], Stroke::new(1.5, line_color));
        }
    }
}

/// Draw agent entities as colored circles with status-based styling.
fn draw_agents(
    painter: &Painter,
    canvas_rect: Rect,
    state: &SimState,
    config: &CanvasConfig,
    ui: &mut egui::Ui,
) {
    for entity in &state.entities {
        let screen_pos = world_to_screen(entity.pos_x, entity.pos_y, canvas_rect, config);
        let radius = 5.0;

        let (fill_color, stroke_color) = match entity.negotiation_status.as_str() {
            "idle" => (
                Color32::from_rgb(70, 130, 200),
                Color32::from_rgb(100, 160, 230),
            ),
            "offering" => (
                Color32::from_rgb(230, 180, 40),
                Color32::from_rgb(255, 210, 70),
            ),
            "countering" => (
                Color32::from_rgb(200, 140, 30),
                Color32::from_rgb(240, 180, 50),
            ),
            "accepted" => (
                Color32::from_rgb(40, 200, 80),
                Color32::from_rgb(60, 240, 110),
            ),
            "rejected" => (
                Color32::from_rgb(200, 50, 50),
                Color32::from_rgb(240, 80, 80),
            ),
            "timeout" => (
                Color32::from_rgb(120, 120, 120),
                Color32::from_rgb(160, 160, 160),
            ),
            _ => (
                Color32::from_rgb(100, 100, 100),
                Color32::from_rgb(140, 140, 140),
            ),
        };

        // Outer glow for active negotiators
        if entity.negotiation_status != "idle" {
            painter.circle_filled(screen_pos, radius + 3.0, fill_color.gamma_multiply(0.3));
        }

        painter.circle_filled(screen_pos, radius, fill_color);
        painter.circle_stroke(screen_pos, radius, Stroke::new(1.0, stroke_color));

        // Velocity indicator (small line showing direction)
        let vel_scale = 3.0;
        let vel_end = Pos2::new(
            screen_pos.x + entity.vel_x as f32 * vel_scale,
            screen_pos.y + entity.vel_y as f32 * vel_scale,
        );
        painter.line_segment(
            [screen_pos, vel_end],
            Stroke::new(1.0, Color32::from_rgba_premultiplied(200, 200, 200, 60)),
        );

        // Tooltip on hover
        let hover_rect = Rect::from_center_size(screen_pos, Vec2::splat(radius * 2.0 + 4.0));
        let hover_response = ui.interact(hover_rect, ui.id().with(entity.entity_id), Sense::hover());
        hover_response.on_hover_ui(|ui| {
            ui.strong(&entity.label);
            ui.label(format!("Status: {}", entity.negotiation_status));
            ui.label(format!("Cash: ${:.0}", entity.cash));
            ui.label(format!("Pos: ({:.0}, {:.0})", entity.pos_x, entity.pos_y));
            if entity.counter_party_id > 0 {
                ui.label(format!("Negotiating with: Entity {}", entity.counter_party_id));
            }
            if !entity.assets.is_empty() {
                ui.separator();
                for (name, amount) in &entity.assets {
                    ui.label(format!("  {name}: {amount:.1}"));
                }
            }
        });
    }
}
