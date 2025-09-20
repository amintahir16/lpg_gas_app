const testInventoryAPI = async () => {
  const baseUrl = 'http://localhost:3000';
  
  console.log('Testing Inventory API Endpoints...\n');
  
  // Test 1: Get inventory stats
  try {
    console.log('1. Testing GET /api/inventory/stats');
    const response = await fetch(`${baseUrl}/api/inventory/stats`);
    const data = await response.json();
    console.log('✅ Stats API working:', response.status);
    console.log('Data:', data);
  } catch (error) {
    console.log('❌ Stats API failed:', error.message);
  }
  
  // Test 2: Get cylinders
  try {
    console.log('\n2. Testing GET /api/inventory/cylinders');
    const response = await fetch(`${baseUrl}/api/inventory/cylinders`);
    const data = await response.json();
    console.log('✅ Cylinders API working:', response.status);
    console.log('Cylinders count:', data.cylinders?.length || 0);
  } catch (error) {
    console.log('❌ Cylinders API failed:', error.message);
  }
  
  // Test 3: Get stores
  try {
    console.log('\n3. Testing GET /api/inventory/stores');
    const response = await fetch(`${baseUrl}/api/inventory/stores`);
    const data = await response.json();
    console.log('✅ Stores API working:', response.status);
    console.log('Stores count:', data.stores?.length || 0);
  } catch (error) {
    console.log('❌ Stores API failed:', error.message);
  }
  
  // Test 4: Get vehicles
  try {
    console.log('\n4. Testing GET /api/inventory/vehicles');
    const response = await fetch(`${baseUrl}/api/inventory/vehicles`);
    const data = await response.json();
    console.log('✅ Vehicles API working:', response.status);
    console.log('Vehicles count:', data.vehicles?.length || 0);
  } catch (error) {
    console.log('❌ Vehicles API failed:', error.message);
  }
  
  // Test 5: Get regulators
  try {
    console.log('\n5. Testing GET /api/inventory/regulators');
    const response = await fetch(`${baseUrl}/api/inventory/regulators`);
    const data = await response.json();
    console.log('✅ Regulators API working:', response.status);
    console.log('Regulators count:', data.regulators?.length || 0);
  } catch (error) {
    console.log('❌ Regulators API failed:', error.message);
  }
  
  console.log('\n🎯 API Testing Complete!');
};

// Run the test
testInventoryAPI();
