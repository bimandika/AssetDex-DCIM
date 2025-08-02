// Simple test to verify rack availability integration
console.log('Testing rack availability integration...');

// Check if the main components exist
const fs = require('fs');
const path = require('path');

const componentsToCheck = [
  'src/components/ServerInventory.tsx',
  'src/components/RackAvailabilityChecker.tsx',
  'src/hooks/useRackAvailability.ts',
  'volumes/functions/check-rack-availability/index.ts'
];

let allComponentsExist = true;

componentsToCheck.forEach(component => {
  const filePath = path.join(__dirname, component);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${component} exists`);
  } else {
    console.log(`❌ ${component} missing`);
    allComponentsExist = false;
  }
});

if (allComponentsExist) {
  console.log('\n🎉 All rack availability system components are present!');
  
  // Check for the integration in ServerInventory
  const serverInventoryContent = fs.readFileSync(
    path.join(__dirname, 'src/components/ServerInventory.tsx'), 
    'utf8'
  );
  
  if (serverInventoryContent.includes('RackAvailabilityChecker')) {
    console.log('✅ RackAvailabilityChecker is integrated into ServerInventory');
  } else {
    console.log('❌ RackAvailabilityChecker integration missing in ServerInventory');
  }
  
  if (serverInventoryContent.includes('onSuggestionApply')) {
    console.log('✅ Suggestion callback is implemented');
  } else {
    console.log('❌ Suggestion callback missing');
  }
  
} else {
  console.log('\n❌ Some components are missing. Please ensure all components are created.');
}
