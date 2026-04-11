const calculateTaxesAndInsurances = (baseSalary, totalIncome) => {
    // Tỷ lệ theo luật định
    const empRate = { bhxh: 0.08, bhyt: 0.015, bhtn: 0.01 }; // 10.5%
    const compRate = { bhxh: 0.175, bhyt: 0.03, bhtn: 0.01 }; // 21.5%

    const empInsurance = {
        bhxh: baseSalary * empRate.bhxh,
        bhyt: baseSalary * empRate.bhyt,
        bhtn: baseSalary * empRate.bhtn,
        total: baseSalary * 0.105
    };

    const compInsurance = {
        bhxh: baseSalary * compRate.bhxh,
        bhyt: baseSalary * compRate.bhyt,
        bhtn: baseSalary * compRate.bhtn,
        total: baseSalary * 0.215
    };

    // Thuế TNCN (Giảm trừ gia cảnh 11tr)
    const personalDeduction = 11000000;
    let taxableIncome = totalIncome - empInsurance.total - personalDeduction;
    let pitTax = 0;

    if (taxableIncome > 0) {
        if (taxableIncome <= 5000000) pitTax = taxableIncome * 0.05;
        else if (taxableIncome <= 10000000) pitTax = 250000 + (taxableIncome - 5000000) * 0.1;
        else pitTax = 750000 + (taxableIncome - 10000000) * 0.15;
    }

    return { empInsurance, compInsurance, pitTax };
};

module.exports = { calculateTaxesAndInsurances };