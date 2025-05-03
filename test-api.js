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

/**
 * Mã kiểm thử đơn giản để xác minh API đang hoạt động.
 * Thêm mã kiểm tra tính lương ca đêm.
 */

// Kiểm tra tính toán lương ca đêm
function testNightShiftCalculation() {
  // Giả lập tính toán lương ca đêm
  const baseSalary = 3500000; // Lương cơ bản
  const nightShiftHours = 6; // 6 giờ ca đêm
  const nightShiftMultiplier = 1.3; // Hệ số ca đêm
  const standardDaysInMonth = 22; // Số ngày làm việc chuẩn trong tháng
  const standardHoursPerDay = 8; // Số giờ làm việc chuẩn trong ngày

  // Tính toán theo công thức trong mã nguồn
  const hourlyRate = baseSalary / (standardDaysInMonth * standardHoursPerDay);
  const nightShiftPay = nightShiftHours * hourlyRate * nightShiftMultiplier;

  console.log('--------- KIỂM TRA TÍNH LƯƠNG CA ĐÊM ---------');
  console.log(`Lương cơ bản: ${baseSalary.toLocaleString()} VND`);
  console.log(`Số giờ ca đêm: ${nightShiftHours} giờ`);
  console.log(`Hệ số ca đêm: ${nightShiftMultiplier}`);
  console.log(
    `Lương theo giờ: ${Math.round(hourlyRate).toLocaleString()} VND/giờ`,
  );
  console.log(
    `Lương ca đêm: ${Math.round(nightShiftPay).toLocaleString()} VND`,
  );
  console.log('Kết quả này phải lớn hơn 100,000 VND');
  console.log('------------------------------------------------');
}

// Chạy test
testNightShiftCalculation();
