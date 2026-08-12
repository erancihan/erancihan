# Review — unit 9 (08-flight-and-input) · pedagogy reviewer · 9/10

Verified
- Format OK: 39% code, no block over 20 added lines.
- Cumulative replay: Input.swift, FlightControlSystem.swift, GameView.swift and
  main.swift all match canonical. main.swift reconstructing correctly through the
  06.B -> 07 -> 08 diff chain is the strongest evidence so far that cross-chapter
  anchoring works.

Strengths
- The input abstraction is justified by a concrete future (gamepad sticks produce
  the in-between values keyboards can't) rather than asserted as good practice.
- Key codes vs characters gets a real consequence: AZERTY users' controls scatter.
- rebuild()-from-scratch is explained via two behaviours that fall out free —
  diagonals work, opposite keys cancel — instead of being presented as arbitrary.
- The three ideas in the rotation block are separated and named: rates x dt,
  right-multiplication (with the exact wrong-feel it prevents), renormalising.
- autoBank gets its own section and an instruction to zero it and fly, which is
  the cheapest game-feel lesson available.
- The event-monitor return value is explained as consume-vs-forward, including
  why Command must pass through and why flagsChanged must not be swallowed.
- Checkpoint's four tests each isolate one thing just written, including flying
  past vertical to demonstrate the absence of gimbal lock.
- Challenge (throttle) names three specific traps rather than just the goal.

Concerns (accepted)
- Ordering constraint (flight before movement) is asserted with its consequence
  described but not demonstrated; demonstrating a one-frame lag needs tooling
  the guide doesn't have.
