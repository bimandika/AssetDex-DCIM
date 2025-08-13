# Server Position History Log Feature Plan

## Objective
Enable tracking and display of server position changes (rack, unit, room, etc.) in the application. When a user edits a server's position, a history log will be recorded and shown below the server details.

---

## 1. Database Changes
- **Create new table:** `server_position_history`
  - `id` (UUID, PK)
  - `server_id` (UUID, FK to servers)
  - `previous_rack` (text)
  - `previous_unit` (text)
  - `previous_room` (text)
  - `previous_floor` (text)
  - `previous_building` (text)
  - `previous_site` (text)
  - `new_rack` (text)
  - `new_unit` (text)
  - `new_room` (text)
  - `new_floor` (text)
  - `new_building` (text)
  - `new_site` (text)
  - `changed_by` (UUID, FK to users)
  - `changed_at` (timestamp)
  - `notes` (text, optional)

- **Add trigger/function:** On update of server position fields, insert a row into `server_position_history`.

-- Function: Log server position changes
CREATE OR REPLACE FUNCTION public.log_server_position_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if any position field changes
  IF (
    NEW.rack IS DISTINCT FROM OLD.rack OR
    NEW.unit IS DISTINCT FROM OLD.unit OR
    NEW.dc_room IS DISTINCT FROM OLD.dc_room OR
    NEW.dc_floor IS DISTINCT FROM OLD.dc_floor OR
    NEW.dc_building IS DISTINCT FROM OLD.dc_building OR
    NEW.dc_site IS DISTINCT FROM OLD.dc_site
  ) THEN
    INSERT INTO public.server_position_history (
      server_id,
      previous_rack, previous_unit, previous_room, previous_floor, previous_building, previous_site,
      new_rack, new_unit, new_room, new_floor, new_building, new_site,
      changed_by, changed_at, notes
    ) VALUES (
      OLD.id,
      OLD.rack, OLD.unit, OLD.dc_room, OLD.dc_floor, OLD.dc_building, OLD.dc_site,
      NEW.rack, NEW.unit, NEW.dc_room, NEW.dc_floor, NEW.dc_building, NEW.dc_site,
      NEW.updated_by, NOW(), NULL
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Call function after server position update
CREATE TRIGGER trigger_log_server_position_change
AFTER UPDATE ON public.servers
FOR EACH ROW
EXECUTE FUNCTION public.log_server_position_change();

---

## 2. Backend/API Changes
- **Expose endpoint:**
  - `GET /servers/:id/position-history` — returns position change history for a server
  - `POST /servers/:id/move` — moves server and records history
- **Update server edit logic:**
  - On position change, call history log insert

---

## 3. Frontend/UI Changes
- **Server details page:**
  - Add a section below server info: "Position History"
  - Display a table/timeline of previous moves:
    - Date/time
    - Previous position
    - New position
    - Changed by
    - Notes
- **Edit server dialog:**
  - After the save button, show a badge or alert summarizing the most recent move (e.g., "Last moved: 2025-08-11 by admin").
  - Use color coding for move types or recent changes (e.g., blue for info, yellow for recent, red for critical moves).
  - Below the badge/alert, show a "Position History" section with a table/timeline of all moves.
  - Make the history section collapsible/expandable if the history is long.
  - If there is no history for the server, neither the badge nor the section will appear.

  **Example React code:**
  ```tsx
  {/* ...existing dialog code... */}
  <Button onClick={handleSave}>Save</Button>
  {history.length > 0 && (
    <>
      <Badge color="info" className="mt-4 mb-2">
        Last moved: {formatDate(history[0].changed_at)} by {history[0].changed_by_name}
      </Badge>
      <CollapsibleSection title="Position History" defaultOpen={false}>
        <table className="w-full text-sm border">
          <thead>
            <tr>
              <th>Date/Time</th>
              <th>Previous</th>
              <th>New</th>
              <th>Changed By</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {history.map((entry) => (
              <tr key={entry.id}>
                <td>{formatDate(entry.changed_at)}</td>
                <td>{`${entry.previous_rack}/${entry.previous_unit}/${entry.previous_room}`}</td>
                <td>{`${entry.new_rack}/${entry.new_unit}/${entry.new_room}`}</td>
                <td>{entry.changed_by_name}</td>
                <td>{entry.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CollapsibleSection>
    </>
  )}
  {/* ...existing code... */}
  ```
---

## 4. Migration & Data Integrity
- **Migration script:**
  - Create `server_position_history` table
  - Add triggers/functions for logging
- **Backfill:**
  - Optionally backfill history for existing servers (if possible)

---

## 5. Security & Audit
- **RLS policies:**
  - Only allow users to view history for servers they can access
  - Only allow insert via server move/edit

---

## 6. Documentation
- Update API and user docs to describe history log feature

---

## 7. Future Enhancements
- Add support for bulk moves
- Add diff view for other server property changes
- Export history logs

---

## Example Table Schema
```sql
CREATE TABLE public.server_position_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  previous_rack TEXT,
  previous_unit TEXT,
  previous_room TEXT,
  previous_floor TEXT,
  previous_building TEXT,
  previous_site TEXT,
  new_rack TEXT,
  new_unit TEXT,
  new_room TEXT,
  new_floor TEXT,
  new_building TEXT,
  new_site TEXT,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);
```

---

## Example UI Mockup
```
[Server Details]
-----------------------------
Rack: RACK-45 | Unit: U34 | Room: MDF
...

[Position History]
| Date/Time         | Previous         | New              | Changed By | Notes |
|-------------------|-----------------|------------------|------------|-------|
| 2025-08-11 10:23  | RACK-45/U34/MDF | RACK-46/U38/MDF  | admin      | Move for DR |
| ...               | ...             | ...              | ...        | ...   |
```

---

## Implementation Steps
1. Add table and triggers to migration:
   - Add the CREATE TABLE statement for server_position_history to database/consolidated-migration.sql.
2. Implement backend logic for move/edit:
   - Create backend function to handle position history (e.g., get and insert).
   - Add routing for the function in volumes/functions/main/index.ts.
   - Create config.toml for the function, referencing config from other functions for consistency.
3. Add frontend history section (badge/alert + table/timeline).
4. Test and document.
