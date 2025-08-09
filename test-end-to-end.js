const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Test data
const testUsers = {
  admin: { email: 'admin@lpg.com', password: 'admin123' },
  superAdmin: { email: 'superadmin@lpg.com', password: 'super123' },
  customer: { email: 'customer@lpg.com', password: 'customer123' },
  vendor: { email: 'vendor@lpg.com', password: 'vendor123' }
};

class QATestSuite {
  constructor() {
    this.results = [];
    this.session = null;
  }

  log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${type}] ${message}`);
  }

  async test(testName, testFunction) {
    try {
      this.log(`🧪 Starting test: ${testName}`);
      await testFunction();
      this.log(`✅ PASS: ${testName}`, 'PASS');
      this.results.push({ name: testName, status: 'PASS' });
    } catch (error) {
      this.log(`❌ FAIL: ${testName} - ${error.message}`, 'FAIL');
      this.results.push({ name: testName, status: 'FAIL', error: error.message });
    }
  }

  async testServerHealth() {
    const response = await axios.get(`${BASE_URL}/login`);
    if (response.status !== 200) {
      throw new Error(`Server not responding properly. Status: ${response.status}`);
    }
    this.log('Server is healthy and responding');
  }

  async testAuthentication() {
    // Test login page accessibility
    const loginResponse = await axios.get(`${BASE_URL}/login`);
    if (loginResponse.status !== 200) {
      throw new Error('Login page not accessible');
    }

    // Test that unauthenticated users are redirected to login
    try {
      await axios.get(`${BASE_URL}/dashboard`);
      throw new Error('Unauthenticated access to dashboard should be blocked');
    } catch (error) {
      if (error.response && error.response.status === 302) {
        this.log('✅ Unauthenticated access properly redirected');
      } else {
        throw new Error('Authentication middleware not working properly');
      }
    }
  }

  async testAPIEndpoints() {
    const endpoints = [
      '/api/dashboard/stats',
      '/api/customers',
      '/api/cylinders',
      '/api/expenses',
      '/api/vendors',
      '/api/reports'
    ];

    for (const endpoint of endpoints) {
      try {
        await axios.get(`${BASE_URL}${endpoint}`);
        throw new Error(`Unauthenticated access to ${endpoint} should be blocked`);
      } catch (error) {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          this.log(`✅ ${endpoint} properly protected`);
        } else {
          throw new Error(`${endpoint} not properly secured`);
        }
      }
    }
  }

  async testDatabaseIntegration() {
    // Test that the database has been populated
    const response = await axios.get(`${BASE_URL}/api/dashboard/stats`, {
      headers: {
        'x-user-id': 'test-user',
        'x-user-role': 'ADMIN'
      }
    });

    if (response.status !== 200) {
      throw new Error('Dashboard stats API not working');
    }

    const data = response.data;
    if (!data.totalCustomers || !data.activeCylinders) {
      throw new Error('Dashboard stats not returning expected data');
    }

    this.log(`✅ Database integration working - ${data.totalCustomers} customers, ${data.activeCylinders} cylinders`);
  }

  async testRoleBasedAccess() {
    const roles = ['ADMIN', 'SUPER_ADMIN', 'USER', 'VENDOR'];
    
    for (const role of roles) {
      try {
        const response = await axios.get(`${BASE_URL}/api/dashboard/stats`, {
          headers: {
            'x-user-id': `test-user-${role}`,
            'x-user-role': role
          }
        });
        
        if (response.status === 200) {
          this.log(`✅ Role-based access working for ${role}`);
        } else {
          throw new Error(`Role-based access failed for ${role}`);
        }
      } catch (error) {
        if (error.response && error.response.status === 403) {
          this.log(`✅ Proper access control for ${role}`);
        } else {
          throw new Error(`Role-based access test failed for ${role}: ${error.message}`);
        }
      }
    }
  }

  async testDataRetrieval() {
    const endpoints = [
      { url: '/api/customers', name: 'Customers' },
      { url: '/api/cylinders', name: 'Cylinders' },
      { url: '/api/expenses', name: 'Expenses' },
      { url: '/api/vendors', name: 'Vendors' }
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${BASE_URL}${endpoint.url}`, {
          headers: {
            'x-user-id': 'test-admin',
            'x-user-role': 'ADMIN'
          }
        });

        if (response.status === 200) {
          const data = response.data;
          if (data.pagination && data.pagination.total >= 0) {
            this.log(`✅ ${endpoint.name} API working - ${data.pagination.total} records`);
          } else {
            throw new Error(`${endpoint.name} API not returning proper data structure`);
          }
        } else {
          throw new Error(`${endpoint.name} API returned status ${response.status}`);
        }
      } catch (error) {
        throw new Error(`${endpoint.name} API test failed: ${error.message}`);
      }
    }
  }

  async testSearchAndFiltering() {
    const searchTests = [
      { url: '/api/customers?search=John', name: 'Customer Search' },
      { url: '/api/cylinders?status=AVAILABLE', name: 'Cylinder Filter' },
      { url: '/api/expenses?category=FUEL', name: 'Expense Filter' }
    ];

    for (const test of searchTests) {
      try {
        const response = await axios.get(`${BASE_URL}${test.url}`, {
          headers: {
            'x-user-id': 'test-admin',
            'x-user-role': 'ADMIN'
          }
        });

        if (response.status === 200) {
          this.log(`✅ ${test.name} working`);
        } else {
          throw new Error(`${test.name} failed with status ${response.status}`);
        }
      } catch (error) {
        throw new Error(`${test.name} test failed: ${error.message}`);
      }
    }
  }

  async testPagination() {
    const paginationTests = [
      { url: '/api/customers?page=1&limit=5', name: 'Customer Pagination' },
      { url: '/api/cylinders?page=1&limit=5', name: 'Cylinder Pagination' }
    ];

    for (const test of paginationTests) {
      try {
        const response = await axios.get(`${BASE_URL}${test.url}`, {
          headers: {
            'x-user-id': 'test-admin',
            'x-user-role': 'ADMIN'
          }
        });

        if (response.status === 200) {
          const data = response.data;
          if (data.pagination && data.pagination.page === 1 && data.pagination.limit === 5) {
            this.log(`✅ ${test.name} working`);
          } else {
            throw new Error(`${test.name} pagination data incorrect`);
          }
        } else {
          throw new Error(`${test.name} failed with status ${response.status}`);
        }
      } catch (error) {
        throw new Error(`${test.name} test failed: ${error.message}`);
      }
    }
  }

  async runAllTests() {
    this.log('🚀 Starting Comprehensive End-to-End Testing');
    this.log('==========================================');

    await this.test('Server Health Check', () => this.testServerHealth());
    await this.test('Authentication System', () => this.testAuthentication());
    await this.test('API Security', () => this.testAPIEndpoints());
    await this.test('Database Integration', () => this.testDatabaseIntegration());
    await this.test('Role-Based Access Control', () => this.testRoleBasedAccess());
    await this.test('Data Retrieval APIs', () => this.testDataRetrieval());
    await this.test('Search and Filtering', () => this.testSearchAndFiltering());
    await this.test('Pagination System', () => this.testPagination());

    this.generateReport();
  }

  generateReport() {
    this.log('📊 TEST RESULTS SUMMARY');
    this.log('========================');

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const total = this.results.length;

    this.log(`Total Tests: ${total}`);
    this.log(`✅ Passed: ${passed}`);
    this.log(`❌ Failed: ${failed}`);
    this.log(`📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (failed > 0) {
      this.log('\n❌ FAILED TESTS:');
      this.results.filter(r => r.status === 'FAIL').forEach(result => {
        this.log(`- ${result.name}: ${result.error}`);
      });
    }

    this.log('\n🎯 RECOMMENDATIONS:');
    if (passed === total) {
      this.log('✅ All tests passed! Application is ready for production deployment.');
    } else {
      this.log('⚠️  Some tests failed. Please review and fix the issues before deployment.');
    }
  }
}

// Run the test suite
const testSuite = new QATestSuite();
testSuite.runAllTests().catch(console.error); 