// src/utils/schemaMeta.ts
// Utility to fetch available fields for a table (static example)

export function getTableFields(table: string): string[] {
  // In a real app, fetch from backend or schema metadata
  const fields: Record<string, string[]> = {
    servers: [
      'dc_site', 'status', 'allocation', 'environment', 'model', 'brand', 'device_type', 'rack', 'unit', 'hostname', 'serial_number'
    ],
    racks: ['rack_name', 'dc_site', 'dc_building', 'dc_floor', 'dc_room', 'description'],
    rooms: ['room_type', 'dc_site', 'dc_building', 'dc_floor'],
    // ...other tables
  };
  return fields[table] || [];
}
