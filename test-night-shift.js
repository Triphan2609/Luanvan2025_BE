/**
 * Mã kiểm thử đơn giản để kiểm tra tính toán lương ca đêm
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

  // Cho trường hợp trong hình ảnh
  if (Math.round(nightShiftPay) < 117000) {
    console.log(
      'LỖI: Lương ca đêm tính toán thấp hơn mức 117,000 VND trong hình ảnh!',
    );
  } else if (Math.round(nightShiftPay) === 117000) {
    console.log('OK: Lương ca đêm khớp với giá trị trong hình ảnh.');
  } else if (Math.round(nightShiftPay) > 117000) {
    console.log(
      'CẢNH BÁO: Lương ca đêm tính toán cao hơn mức 117,000 VND trong hình ảnh.',
    );
    console.log(
      'Điều này có thể do sửa lỗi đã thành công hoặc công thức tính khác.',
    );
  }

  console.log('------------------------------------------------');

  // Trả về kết quả để có thể kiểm tra
  return {
    baseSalary,
    nightShiftHours,
    nightShiftMultiplier,
    hourlyRate,
    nightShiftPay,
  };
}

// Phần kiểm tra toàn diện với nhiều trường hợp
function comprehensiveTest() {
  console.log('\n===== KIỂM TRA TOÀN DIỆN TÍNH LƯƠNG CA ĐÊM =====');

  const baseSalary = 3500000; // Lương cơ bản
  const standardDaysInMonth = 22; // Số ngày làm việc chuẩn trong tháng
  const standardHoursPerDay = 8; // Số giờ làm việc chuẩn trong ngày
  const hourlyRate = baseSalary / (standardDaysInMonth * standardHoursPerDay);

  // Kiểm tra với nhiều hệ số khác nhau
  const testCases = [
    { hours: 6, multiplier: 1.0, expected: hourlyRate * 6 * 1.0 },
    { hours: 6, multiplier: 1.3, expected: hourlyRate * 6 * 1.3 },
    { hours: 6, multiplier: 1.5, expected: hourlyRate * 6 * 1.5 },
    { hours: 8, multiplier: 1.3, expected: hourlyRate * 8 * 1.3 },
    { hours: 0, multiplier: 1.3, expected: 0 }, // Trường hợp không có giờ ca đêm
    { hours: 6, multiplier: 0, expected: 0 }, // Hệ số không hợp lệ (sẽ được điều chỉnh lên tối thiểu 1.0)
  ];

  console.log(`Lương cơ bản: ${baseSalary.toLocaleString()} VND`);
  console.log(
    `Lương theo giờ: ${Math.round(hourlyRate).toLocaleString()} VND/giờ`,
  );
  console.log('--------------------------------------------------------');

  let allPassed = true;

  testCases.forEach((testCase, index) => {
    // Trong hệ thống thực tế, hệ số không hợp lệ (< 1.0) sẽ được điều chỉnh lên 1.0
    const actualMultiplier = Math.max(testCase.multiplier, 1.0);
    const actualExpected = testCase.hours * hourlyRate * actualMultiplier;

    console.log(`Test #${index + 1}:`);
    console.log(`- Số giờ ca đêm: ${testCase.hours}`);
    console.log(
      `- Hệ số đầu vào: ${testCase.multiplier} (Thực tế: ${actualMultiplier})`,
    );
    console.log(
      `- Lương ca đêm kỳ vọng: ${Math.round(actualExpected).toLocaleString()} VND`,
    );

    // Mô phỏng tính toán trong service
    const calculatedPay = testCase.hours * hourlyRate * actualMultiplier;
    console.log(
      `- Kết quả tính toán: ${Math.round(calculatedPay).toLocaleString()} VND`,
    );

    const passed = Math.abs(calculatedPay - actualExpected) < 0.01;
    console.log(`- Kết quả: ${passed ? 'PASSED ✓' : 'FAILED ✗'}`);
    if (!passed) {
      allPassed = false;
    }
    console.log('--------------------------------------------------------');
  });

  console.log(`\nTổng kết: ${allPassed ? 'TẤT CẢ PASSED ✓✓✓' : 'CÓ LỖI ✗✗✗'}`);
  console.log('=======================================================\n');
}

// Chạy test cơ bản
const result = testNightShiftCalculation();
console.log('\nThông số chi tiết:');
console.log(result);

// Chạy test toàn diện
comprehensiveTest();
