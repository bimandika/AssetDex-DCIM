// 🐛 LOGICAL VIEW DEBUG AND FIXES
// File: src/utils/debugRoomView.ts

export const debugServerData = (servers: any[], viewMode: string) => {
  if (process.env.NODE_ENV !== 'development') return;
  
  console.log(`🔍 RoomView Debug - Current View Mode: ${viewMode}`);
  
  if (servers.length > 0) {
    const sample = servers[0];
    console.log('🔍 Sample Server Data:', sample);
    console.log('🔍 Available Fields:', Object.keys(sample));
    
    // Check logical view fields
    const logicalFields = {
      hostname: sample.hostname,
      ipAddress: sample.ipAddress, 
      allocation: sample.allocation
    };
    
    console.log('🔍 Logical Fields:', logicalFields);
    
    // Count servers with complete logical data
    const completeLogical = servers.filter(s => 
      s.hostname && s.hostname !== '' &&
      s.ipAddress && s.ipAddress !== '' &&
      s.allocation && s.allocation !== ''
    ).length;
    
    console.log(`📊 Servers ready for logical view: ${completeLogical}/${servers.length}`);
  }
};

export const getLogicalViewStats = (racksData: any[]) => {
  const allServers = racksData.flatMap(rack => rack.servers || []);
  
  return {
    total: allServers.length,
    withHostname: allServers.filter(s => s.hostname && s.hostname !== '').length,
    withIpAddress: allServers.filter(s => s.ipAddress && s.ipAddress !== '').length,
    withAllocation: allServers.filter(s => s.allocation && s.allocation !== '').length,
    complete: allServers.filter(s => 
      s.hostname && s.hostname !== '' &&
      s.ipAddress && s.ipAddress !== '' &&
      s.allocation && s.allocation !== ''
    ).length
  };
};
