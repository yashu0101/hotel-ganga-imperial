# New booking panel, refined (short design)

Date: 2026-11-28 · Status: proposed · Size: small change

**Intent.** The New booking form works but reads like a long generic form: a dropdown for the most important choice,
plain number boxes, and the result only visible after saving. Staff take these bookings on the phone, so the panel
should let them pick, check and save at a glance while the calendar stays visible.

**Approaches.** Centred two-column dialog (fits one screen, hides the calendar); step-by-step dialog (calm, more
clicks); **refined side panel — picked by the user** (keeps the calendar visible beside it).

**Goals.**

- Room or event chosen from cards, not a dropdown: rooms (name + nightly rate), then events (Banquet hall and each
  active package), then Dining enquiry. The selected card is marked with a check and the brass accent.
- A summary card at the top that updates as staff type: type × rooms, dates with weekdays, nights, guests, status.
- Rooms and guests as − / + steppers (still typeable), within the same limits as the server (rooms 1–10, guests
  1–20 or 1–300 for events).
- Status as a two-option segmented control (Confirmed / Pending).
- Guest fields tighter: name full width; phone + email; city + notes. Panel width ~520px, sticky footer.

**Non-goals.** No change to validation, the API, what gets saved, or the edit drawers for content.

**Constraints.** Keyboard and screen-reader use: cards are a radio group, steppers are labelled buttons around a
number input, the summary is `aria-live="polite"`. Strings in en + hi. Same dirty-check before closing.

**Left to the builder.** Exact card styling within the admin design rules (one accent, 6/10/999 radii); how many
cards per row.
