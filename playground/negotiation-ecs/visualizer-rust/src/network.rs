//! Async background network handler for receiving gRPC simulation frames.
//!
//! This module runs on a dedicated tokio runtime thread, completely separate
//! from the egui render loop. It connects to the Go backend, receives
//! SimFrame messages, converts them to UI view types, and pushes them
//! into the shared `Arc<Mutex<SimState>>`.

use std::sync::{Arc, Mutex};
use std::time::Duration;

use crate::state::{EntityView, NegotiationEventView, SimState, TickStatsView};

/// Generated protobuf module.
pub mod proto {
    tonic::include_proto!("negotiation.v1");
}

use proto::simulation_service_client::SimulationServiceClient;
use proto::StreamRequest;

/// Spawn the background network receiver on a new OS thread with its own
/// tokio runtime. This ensures the egui render loop is never blocked.
pub fn spawn_network_thread(state: Arc<Mutex<SimState>>, server_addr: String) {
    std::thread::Builder::new()
        .name("grpc-receiver".to_string())
        .spawn(move || {
            let rt = tokio::runtime::Builder::new_current_thread()
                .enable_all()
                .build()
                .expect("Failed to create tokio runtime");

            rt.block_on(async move {
                loop {
                    match connect_and_stream(&state, &server_addr).await {
                        Ok(_) => {
                            eprintln!("[network] Stream ended normally, reconnecting...");
                        }
                        Err(e) => {
                            eprintln!("[network] Connection error: {e}");
                            {
                                let mut s = state.lock().unwrap();
                                s.connected = false;
                                s.connection_error = Some(format!("{e}"));
                            }
                        }
                    }

                    // Exponential backoff with cap
                    eprintln!("[network] Reconnecting in 2 seconds...");
                    tokio::time::sleep(Duration::from_secs(2)).await;
                }
            });
        })
        .expect("Failed to spawn network thread");
}

/// Connect to the gRPC server and stream frames until disconnection.
async fn connect_and_stream(
    state: &Arc<Mutex<SimState>>,
    server_addr: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let addr = format!("http://{server_addr}");
    eprintln!("[network] Connecting to {addr}...");

    let mut client = SimulationServiceClient::connect(addr).await?;

    eprintln!("[network] Connected! Starting stream...");
    {
        let mut s = state.lock().unwrap();
        s.connected = true;
        s.connection_error = None;
    }

    let request = tonic::Request::new(StreamRequest { max_fps: 30 });
    let mut stream = client.stream_simulation(request).await?.into_inner();

    while let Some(frame) = stream.message().await? {
        // Convert protobuf types to view types
        let entities: Vec<EntityView> = frame
            .entities
            .iter()
            .map(|e| {
                let pos = e.position.as_ref();
                let vel = e.velocity.as_ref();
                let inv = e.inventory.as_ref();

                let assets: Vec<(String, f64)> = inv
                    .map(|i| i.assets.iter().map(|(k, v)| (k.clone(), *v)).collect())
                    .unwrap_or_default();

                EntityView {
                    entity_id: e.entity_id,
                    role: e.role.clone(),
                    label: e.label.clone(),
                    pos_x: pos.map(|p| p.x).unwrap_or(0.0),
                    pos_y: pos.map(|p| p.y).unwrap_or(0.0),
                    vel_x: vel.map(|v| v.x).unwrap_or(0.0),
                    vel_y: vel.map(|v| v.y).unwrap_or(0.0),
                    cash: inv.map(|i| i.cash).unwrap_or(0.0),
                    assets,
                    negotiation_status: status_to_string(e.negotiation_status),
                    counter_party_id: e.counter_party_id,
                }
            })
            .collect();

        let events: Vec<NegotiationEventView> = frame
            .events
            .iter()
            .map(|e| NegotiationEventView {
                tick: e.tick,
                initiator_id: e.initiator_id,
                responder_id: e.responder_id,
                action: action_to_string(e.action),
                summary: e.summary.clone(),
                proposal_json: e.proposal_json.clone(),
            })
            .collect();

        let stats = frame.stats.as_ref().map(|s| TickStatsView {
            total_entities: s.total_entities,
            active_negotiations: s.active_negotiations,
            completed_negotiations: s.completed_negotiations,
            timed_out_negotiations: s.timed_out_negotiations,
        }).unwrap_or_default();

        // Update shared state — this is the only lock acquisition point
        {
            let mut s = state.lock().unwrap();
            s.update_from_frame(frame.tick, frame.timestamp, entities, events, stats);
        }
    }

    Ok(())
}

/// Convert protobuf NegotiationStatus enum to display string.
fn status_to_string(status: i32) -> String {
    match status {
        0 => "idle".to_string(),
        1 => "offering".to_string(),
        2 => "countering".to_string(),
        3 => "accepted".to_string(),
        4 => "rejected".to_string(),
        5 => "timeout".to_string(),
        _ => format!("unknown({status})"),
    }
}

/// Convert protobuf NegotiationAction enum to display string.
fn action_to_string(action: i32) -> String {
    match action {
        0 => "unspecified".to_string(),
        1 => "offer_made".to_string(),
        2 => "counter_offer".to_string(),
        3 => "accepted".to_string(),
        4 => "rejected".to_string(),
        5 => "timeout".to_string(),
        _ => format!("unknown({action})"),
    }
}
