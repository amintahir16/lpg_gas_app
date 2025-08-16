// Test file for settings functionality
// This file can be used to test the settings API endpoints

export const testSettingsData = {
  companyName: "Test Company",
  contactEmail: "test@company.com",
  contactPhone: "+1 (555) 123-4567",
  address: "123 Test Street, Test City, TS 12345",
  businessHours: "Monday - Friday: 9AM - 5PM",
  deliveryRadius: 75,
  defaultCreditLimit: 1500,
  taxRate: 9.0,
  currency: "USD",
  timezone: "America/Chicago",
  maintenanceInterval: 120,
  safetyInspectionInterval: 240
};

export const testSettingsUpdate = {
  companyName: "Updated Test Company",
  deliveryRadius: 100,
  taxRate: 10.5
};

// Test function to validate settings
export function validateSettings(settings: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Required fields
  if (!settings.companyName || settings.companyName.trim() === '') {
    errors.push('companyName is required');
  }
  
  if (!settings.contactEmail || settings.contactEmail.trim() === '') {
    errors.push('contactEmail is required');
  }
  
  if (!settings.contactPhone || settings.contactPhone.trim() === '') {
    errors.push('contactPhone is required');
  }
  
  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (settings.contactEmail && !emailRegex.test(settings.contactEmail)) {
    errors.push('contactEmail must be a valid email address');
  }
  
  // Numeric validation
  if (settings.deliveryRadius !== undefined && (isNaN(settings.deliveryRadius) || settings.deliveryRadius < 0)) {
    errors.push('deliveryRadius must be a positive number');
  }
  
  if (settings.defaultCreditLimit !== undefined && (isNaN(settings.defaultCreditLimit) || settings.defaultCreditLimit < 0)) {
    errors.push('defaultCreditLimit must be a positive number');
  }
  
  if (settings.taxRate !== undefined && (isNaN(settings.taxRate) || settings.taxRate < 0 || settings.taxRate > 100)) {
    errors.push('taxRate must be between 0 and 100');
  }
  
  if (settings.maintenanceInterval !== undefined && (isNaN(settings.maintenanceInterval) || settings.maintenanceInterval < 1)) {
    errors.push('maintenanceInterval must be at least 1 day');
  }
  
  if (settings.safetyInspectionInterval !== undefined && (isNaN(settings.safetyInspectionInterval) || settings.safetyInspectionInterval < 1)) {
    errors.push('safetyInspectionInterval must be at least 1 day');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Test function to simulate API calls
export async function testSettingsAPI() {
  try {
    // Test GET request
    const getResponse = await fetch('/api/settings');
    if (!getResponse.ok) {
      throw new Error(`GET failed: ${getResponse.status}`);
    }
    const settings = await getResponse.json();
    console.log('✅ GET /api/settings successful:', settings);
    
    // Test PUT request
    const putResponse = await fetch('/api/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testSettingsData)
    });
    
    if (!putResponse.ok) {
      const errorData = await putResponse.json();
      throw new Error(`PUT failed: ${putResponse.status} - ${errorData.message}`);
    }
    
    const updateResult = await putResponse.json();
    console.log('✅ PUT /api/settings successful:', updateResult);
    
    return { success: true, settings, updateResult };
  } catch (error) {
    console.error('❌ Settings API test failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return { success: false, error: errorMessage };
  }
} 