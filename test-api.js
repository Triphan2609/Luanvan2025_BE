const axios = require('axios');

async function testApi() {
  try {
    const response = await axios.get(
      'http://localhost:8000/api/salary-configs/types',
    );
  } catch (error) {
    console.error('Error status:', error.response?.status);
    console.error('Error data:', error.response?.data);
  }
}

testApi();
