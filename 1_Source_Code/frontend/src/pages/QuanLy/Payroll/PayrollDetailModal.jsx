import React from 'react';
import { X, CheckCircle, Wallet, ShieldCheck, Building, Landmark } from 'lucide-react';

const PayrollDetailModal = ({ data, onClose }) => {
  const fmt = (val) => new Intl.NumberFormat('vi-VN').format(val || 0) + " đ";

  return (
    <div className="fixed inset-0 bg-gray-900/70 flex items-center justify-center z-[1000] p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl">
        
        <div className="px-8 py-6 border-b flex justify-between items-center bg-white rounded-t-3xl">
          <div>
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Phiếu Lương: {data.full_name}</h2>
            <p className="text-blue-600 font-bold mt-1 text-sm">{data.employee_code} | {data.department_name}</p>
          </div>
          <button onClick={onClose} className="p-3 bg-gray-100 hover:bg-red-500 hover:text-white rounded-full transition-all"><X size={24} /></button>
        </div>

        <div className="p-8 overflow-y-auto flex-1 grid grid-cols-2 gap-8 bg-gray-50/50">
          {/* CỘT 1 */}
          <div className="space-y-6">
            <section className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <h3 className="text-blue-600 font-black mb-4 flex items-center gap-2 uppercase text-xs tracking-widest"><Wallet size={16}/> Thu nhập (Gross)</h3>
              <div className="space-y-3 text-sm font-medium text-gray-600">
                <div className="flex justify-between"><span>Lương hợp đồng:</span><span className="text-gray-900">{fmt(data.base_salary)}</span></div>
                <div className="flex justify-between"><span>Ngày công ({data.total_work_days}):</span><span className="text-gray-900">{fmt(data.actual_salary)}</span></div>
                <div className="flex justify-between text-green-600"><span>Thưởng:</span><span>+{fmt(data.reward)}</span></div>
                <div className="flex justify-between text-red-500 border-b pb-3"><span>Kỷ luật:</span><span>-{fmt(data.discipline)}</span></div>
                <div className="flex justify-between pt-2 font-black text-lg text-gray-900 uppercase"><span>Tổng Gross:</span><span>{fmt(data.gross_income)}</span></div>
              </div>
            </section>

            <section className="bg-indigo-50/30 rounded-2xl p-6 border border-indigo-100 shadow-sm">
              <h3 className="text-indigo-600 font-black mb-4 flex items-center gap-2 uppercase text-xs tracking-widest"><Building size={16}/> DN đóng Bảo hiểm (21.5%)</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded-xl text-center border border-indigo-50"><p className="text-[10px] text-gray-400 font-black">BHXH</p><p className="font-bold text-indigo-700">{fmt(data.compInsurance.bhxh)}</p></div>
                <div className="bg-white p-3 rounded-xl text-center border border-indigo-50"><p className="text-[10px] text-gray-400 font-black">BHYT</p><p className="font-bold text-indigo-700">{fmt(data.compInsurance.bhyt)}</p></div>
                <div className="bg-white p-3 rounded-xl text-center border border-indigo-50"><p className="text-[10px] text-gray-400 font-black">BHTN</p><p className="font-bold text-indigo-700">{fmt(data.compInsurance.bhtn)}</p></div>
              </div>
            </section>
          </div>

          {/* CỘT 2 */}
          <div className="space-y-6">
            <section className="bg-white rounded-2xl p-6 border border-red-100 shadow-sm">
              <h3 className="text-red-500 font-black mb-4 flex items-center gap-2 uppercase text-xs tracking-widest"><ShieldCheck size={16}/> NLĐ đóng Bảo hiểm (10.5%)</h3>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-red-50/50 p-3 rounded-xl text-center"><p className="text-[10px] text-gray-500 font-black">BHXH</p><p className="font-bold text-red-600">-{fmt(data.empInsurance.bhxh)}</p></div>
                <div className="bg-red-50/50 p-3 rounded-xl text-center"><p className="text-[10px] text-gray-500 font-black">BHYT</p><p className="font-bold text-red-600">-{fmt(data.empInsurance.bhyt)}</p></div>
                <div className="bg-red-50/50 p-3 rounded-xl text-center"><p className="text-[10px] text-gray-500 font-black">BHTN</p><p className="font-bold text-red-600">-{fmt(data.empInsurance.bhtn)}</p></div>
              </div>
              <div className="pt-3 border-t flex justify-between font-bold text-gray-600 text-sm">
                <span>Thu nhập sau BH:</span><span>{fmt(data.income_after_insurance)}</span>
              </div>
            </section>

            <section className="bg-orange-50/30 rounded-2xl p-6 border border-orange-100 shadow-sm">
              <h3 className="text-orange-500 font-black mb-4 flex items-center gap-2 uppercase text-xs tracking-widest"><Landmark size={16}/> Thuế & Tổng Chi Phí</h3>
              <div className="space-y-4 font-bold text-sm">
                <div className="flex justify-between"><span>Thuế TNCN (Trừ vào lương):</span><span className="text-red-600">-{fmt(data.pitTax)}</span></div>
                <div className="flex justify-between pt-4 border-t border-orange-200">
                  <span className="text-gray-800 font-black uppercase">Chi phí Lương (CTY thanh toán):</span>
                  <span className="font-black text-indigo-700 text-lg">{fmt(data.company_cost)}</span>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="p-8 bg-white border-t rounded-b-3xl">
          <div className="bg-green-600 text-white px-10 py-6 rounded-2xl flex justify-between items-center shadow-xl shadow-green-100">
            <div>
              <p className="text-green-200 text-xs font-black uppercase tracking-widest mb-1">Thực nhận cuối cùng</p>
              <span className="text-xl font-black flex items-center gap-2"><CheckCircle size={28} /> NET SALARY</span>
            </div>
            <span className="text-5xl font-black">{fmt(data.net_salary)}</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PayrollDetailModal;