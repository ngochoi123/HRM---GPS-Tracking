import React, { useState, useRef, useEffect } from "react";
import { Eye, Edit, X, Search } from "lucide-react"; // Đã thêm icon Search

export default function NotificationPage() {
  const [open, setOpen] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const editorRef = useRef(null);

  // --- STATE CHO TÌM KIẾM & BỘ LỌC ---
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTarget, setFilterTarget] = useState("Tất cả phòng ban");
  const [filterStatus, setFilterStatus] = useState("Tất cả trạng thái");

  const [form, setForm] = useState({
    title: "",
    target: "Tất cả nhân viên",
    type: "Thông tin chung (Bình thường)",
    content: "",
  });

  useEffect(() => {
    if (open && editorRef.current) {
      editorRef.current.innerHTML = editItem ? editItem.content : "";
    }
  }, [open, editItem]);

  const handleFormat = (cmd) => {
    document.execCommand(cmd, false, null);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const data = [
    {
      icon: "ℹ️",
      color: "blue",
      title: "Thông báo lịch nghỉ lễ Quốc khánh 02/09",
      desc: "Công ty thông báo lịch nghỉ lễ Quốc khánh năm nay kéo dài 4 ngày...",
      target: "Toàn công ty",
      date: "10/08/2022",
      time: "09:30 AM",
      status: "Đã gửi",
      content: "<b>Nghỉ lễ 4 ngày</b><br/>Áp dụng toàn công ty",
    },
    {
      icon: "⚠️",
      color: "red",
      title: "Cảnh báo vi phạm GPS",
      desc: "Phát hiện nhân viên rời khỏi khu vực làm việc...",
      target: "Phòng Kinh Doanh",
      date: "26/03/2026",
      time: "14:15 PM",
      status: "Nháp",
      content: "Yêu cầu giải trình việc rời vùng an toàn trong giờ làm việc.",
    }
  ];

  // --- LOGIC LỌC DỮ LIỆU ---
  const filteredData = data.filter((item) => {
    const matchSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        item.desc.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTarget = filterTarget === "Tất cả phòng ban" || item.target === filterTarget;
    const matchStatus = filterStatus === "Tất cả trạng thái" || item.status === filterStatus;
    
    return matchSearch && matchTarget && matchStatus;
  });

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-6 font-sans">
      <div className="bg-white rounded-2xl shadow-sm p-6">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 text-xl">🔔</div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Quản Lý Thông báo</h1>
              <p className="text-sm text-gray-500 mt-0.5">Tạo và quản lý các thông báo nội bộ gửi đến nhân viên và phòng ban.</p>
            </div>
          </div>

          <button 
            onClick={() => { 
              setOpen(true); 
              setEditItem(null);
              setForm({ title: "", target: "Tất cả nhân viên", type: "Thông tin chung (Bình thường)", content: "" });
            }} 
            className="flex items-center gap-2 bg-[#14b8a6] hover:bg-teal-600 transition-colors text-white px-5 py-2.5 rounded-xl font-medium shadow-sm"
          >
            <span>➕</span> Tạo thông báo
          </button>
        </div>

        {/* BẢNG VÀ THANH CÔNG CỤ */}
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
          
          {/* TOOLBAR: TÌM KIẾM & BỘ LỌC */}
          <div className="flex flex-col sm:flex-row justify-between items-center p-4 border-b border-gray-200 gap-4 bg-white">
            
            {/* Ô tìm kiếm */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Tìm kiếm thông báo..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-sm transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Bộ lọc Dropdowns */}
            <div className="flex gap-3 w-full sm:w-auto">
              <select
                className="border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-sm text-gray-700 bg-white cursor-pointer transition-all"
                value={filterTarget}
                onChange={(e) => setFilterTarget(e.target.value)}
              >
                <option value="Tất cả phòng ban">Tất cả phòng ban</option>
                <option value="Toàn công ty">Toàn công ty</option>
                <option value="Phòng Kinh Doanh">Phòng Kinh Doanh</option>
                <option value="Phòng IT">Phòng IT</option>
              </select>

              <select
                className="border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-sm text-gray-700 bg-white cursor-pointer transition-all"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="Tất cả trạng thái">Tất cả trạng thái</option>
                <option value="Đã gửi">Đã gửi</option>
                <option value="Nháp">Nháp</option>
              </select>
            </div>
          </div>

          {/* TABLE DATA */}
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="p-4 border-b border-gray-200">TIÊU ĐỀ THÔNG BÁO</th>
                <th className="p-4 border-b border-gray-200">ĐỐI TƯỢNG NHẬN</th>
                <th className="p-4 border-b border-gray-200">NGÀY TẠO/GỬI</th>
                <th className="p-4 border-b border-gray-200">TRẠNG THÁI</th>
                <th className="p-4 border-b border-gray-200 text-center">THAO TÁC</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filteredData.length > 0 ? (
                filteredData.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 text-lg shrink-0">
                          {row.icon}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{row.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{row.desc}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-gray-600 font-medium">{row.target}</td>
                    <td className="p-4 text-gray-500">{row.date} <br/><span className="text-xs">{row.time}</span></td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        row.status === "Đã gửi" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => setViewItem(row)}
                          title="Xem chi tiết"
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => { 
                            setEditItem(row); 
                            setForm({ title: row.title, target: row.target, type: row.type || "Thông tin chung (Bình thường)", content: row.content }); 
                            setOpen(true); 
                          }}
                          title="Chỉnh sửa"
                          className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all"
                        >
                          <Edit size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">
                    Không tìm thấy thông báo nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL TẠO / CHỈNH SỬA */}
      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">

            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-800">
                {editItem ? "✏️ Chỉnh sửa thông báo" : "📝 Soạn thông báo mới"}
              </h2>
              <button onClick={() => setOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tiêu đề thông báo <span className="text-red-500">*</span></label>
                <input 
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all" 
                  placeholder="Nhập tiêu đề thông báo..."
                  value={form.title} 
                  onChange={(e) => setForm({...form, title: e.target.value})} 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Đối tượng nhận</label>
                  <select 
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all bg-white"
                    value={form.target}
                    onChange={(e) => setForm({...form, target: e.target.value})}
                  >
                    <option value="Tất cả nhân viên">Tất cả nhân viên</option>
                    <option value="Toàn công ty">Toàn công ty</option>
                    <option value="Phòng Kinh Doanh">Phòng Kinh Doanh</option>
                    <option value="Phòng IT">Phòng IT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Loại thông báo</label>
                  <select 
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all bg-white"
                    value={form.type}
                    onChange={(e) => setForm({...form, type: e.target.value})}
                  >
                    <option value="Thông tin chung (Bình thường)">Thông tin chung (Bình thường)</option>
                    <option value="Cảnh báo GPS">Cảnh báo GPS</option>
                    <option value="Chỉ đạo công việc">Chỉ đạo công việc</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nội dung chi tiết</label>
                <div className="border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500 transition-all">
                  
                  <div className="flex gap-1.5 p-2 border-b border-gray-200 bg-gray-50">
                    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat("bold")} className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded text-gray-700 font-bold transition-colors">B</button>
                    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat("italic")} className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded text-gray-700 italic font-serif transition-colors">I</button>
                    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat("underline")} className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded text-gray-700 underline transition-colors">U</button>
                  </div>
                  
                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning={true}
                    className="p-4 min-h-[160px] max-h-[250px] overflow-y-auto outline-none text-sm leading-relaxed"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-5 border-t border-gray-100 bg-gray-50/50">
              <button onClick={() => setOpen(false)} className="px-5 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-200 transition-colors">
                Hủy bỏ
              </button>
              <button 
                onClick={() => {
                  const finalContent = editorRef.current.innerHTML;
                  const finalForm = { ...form, content: finalContent };
                  console.log("Lưu dữ liệu:", finalForm);
                  setOpen(false);
                }}
                className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-sm shadow-teal-200 transition-colors flex items-center gap-2"
              >
                Lưu thông báo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL VIEW CHI TIẾT */}
      {viewItem && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex items-start gap-4">
              <div className="w-12 h-12 flex items-center justify-center rounded-full bg-blue-100 text-2xl shrink-0">
                {viewItem.icon}
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800 leading-tight">{viewItem.title}</h2>
                <p className="text-sm text-gray-500 mt-1">Gửi tới: <span className="font-semibold text-gray-700">{viewItem.target}</span></p>
                <p className="text-xs text-gray-400 mt-0.5">{viewItem.date} - {viewItem.time}</p>
              </div>
            </div>
            
            <div className="p-6 min-h-[120px] max-h-[300px] overflow-y-auto text-gray-700 text-sm leading-relaxed" 
                 dangerouslySetInnerHTML={{__html: viewItem.content}} 
            />
            
            <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
              <button onClick={() => setViewItem(null)} className="bg-gray-800 hover:bg-gray-900 text-white px-6 py-2.5 rounded-xl font-medium transition-colors">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}