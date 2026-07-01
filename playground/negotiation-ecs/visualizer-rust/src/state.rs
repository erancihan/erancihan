//! Shared simulation state that bridges the async gRPC receiver
//! with the egui render loop.

use std::collections::VecDeque;

/// Maximum number of negotiation events to retain in the ring buffer.
const MAX_EVENT_HISTORY: usize = 2000;

/// Maximum number of FPS samples for averaging.
const MAX_FPS_SAMPLES: usize = 120;

/// View of an entity's state, pre-converted from protobuf for UI consumption.
#[derive(Clone, Debug)]
pub struct EntityView {
    pub entity_id: u64,
    pub role: String,
    pub label: String,
    pub pos_x: f64,
    pub pos_y: f64,
    pub vel_x: f64,
    pub vel_y: f64,
    pub cash: f64,
    pub assets: Vec<(String, f64)>,
    pub negotiation_status: String,
    pub counter_party_id: u64,
}

/// View of a negotiation event for the log panel.
#[derive(Clone, Debug)]
pub struct NegotiationEventView {
    pub tick: u64,
    pub initiator_id: u64,
    pub responder_id: u64,
    pub action: String,
    pub summary: String,
    pub proposal_json: String,
}

/// Tick-level statistics snapshot.
#[derive(Clone, Debug, Default)]
pub struct TickStatsView {
    pub total_entities: u32,
    pub active_negotiations: u32,
    pub completed_negotiations: u32,
    pub timed_out_negotiations: u32,

    /// Named observability metrics from the backend (e.g. "wealth.gini").
    pub metrics: std::collections::HashMap<String, f64>,
}

/// The central shared state between the network thread and the UI thread.
/// Protected by `Arc<Mutex<SimState>>` — the network thread writes,
/// the UI thread reads.
pub struct SimState {
    /// Current simulation tick.
    pub current_tick: u64,

    /// Logical simulation time in seconds.
    pub timestamp: f64,

    /// Full entity state for the latest frame.
    pub entities: Vec<EntityView>,

    /// Ring buffer of recent negotiation events (newest at back).
    pub events: VecDeque<NegotiationEventView>,

    /// Latest tick statistics.
    pub stats: TickStatsView,

    /// Whether we're connected to the backend.
    pub connected: bool,

    /// Connection error message, if any.
    pub connection_error: Option<String>,

    /// Frames per second (from the gRPC stream, not the UI).
    pub stream_fps: f64,

    /// Internal: FPS measurement samples.
    fps_samples: VecDeque<f64>,
    last_frame_time: Option<std::time::Instant>,

    /// Historical data for charts: (tick, active_negotiations)
    pub negotiation_history: VecDeque<(f64, f64)>,
}

impl SimState {
    pub fn new() -> Self {
        Self {
            current_tick: 0,
            timestamp: 0.0,
            entities: Vec::new(),
            events: VecDeque::with_capacity(MAX_EVENT_HISTORY),
            stats: TickStatsView::default(),
            connected: false,
            connection_error: None,
            stream_fps: 0.0,
            fps_samples: VecDeque::with_capacity(MAX_FPS_SAMPLES),
            last_frame_time: None,
            negotiation_history: VecDeque::with_capacity(1000),
        }
    }

    /// Update state from a received SimFrame.
    pub fn update_from_frame(
        &mut self,
        tick: u64,
        timestamp: f64,
        entities: Vec<EntityView>,
        events: Vec<NegotiationEventView>,
        stats: TickStatsView,
    ) {
        self.current_tick = tick;
        self.timestamp = timestamp;
        self.entities = entities;
        self.stats = stats.clone();

        // Append events to ring buffer
        for event in events {
            if self.events.len() >= MAX_EVENT_HISTORY {
                self.events.pop_front();
            }
            self.events.push_back(event);
        }

        // Track negotiation history for charts
        if self.negotiation_history.len() >= 1000 {
            self.negotiation_history.pop_front();
        }
        self.negotiation_history
            .push_back((timestamp, stats.active_negotiations as f64));

        // FPS calculation
        let now = std::time::Instant::now();
        if let Some(last) = self.last_frame_time {
            let dt = now.duration_since(last).as_secs_f64();
            if dt > 0.0 {
                if self.fps_samples.len() >= MAX_FPS_SAMPLES {
                    self.fps_samples.pop_front();
                }
                self.fps_samples.push_back(1.0 / dt);
                self.stream_fps =
                    self.fps_samples.iter().sum::<f64>() / self.fps_samples.len() as f64;
            }
        }
        self.last_frame_time = Some(now);
    }
    /// Create a UI-safe snapshot of the state (without internal FPS tracking data).
    pub fn clone_for_ui(&self) -> Self {
        Self {
            current_tick: self.current_tick,
            timestamp: self.timestamp,
            entities: self.entities.clone(),
            events: self.events.clone(),
            stats: self.stats.clone(),
            connected: self.connected,
            connection_error: self.connection_error.clone(),
            stream_fps: self.stream_fps,
            fps_samples: VecDeque::new(),
            last_frame_time: None,
            negotiation_history: self.negotiation_history.clone(),
        }
    }
}

impl Default for SimState {
    fn default() -> Self {
        Self::new()
    }
}
