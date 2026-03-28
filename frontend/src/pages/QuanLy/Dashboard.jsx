import React, { useEffect, useState } from "react";
import {  RefreshCw,  Users,  UserCheck,  UserX,  Phone,  Bell,  MapPin,  Calendar,  AlertCircle} from "lucide-react";

export default function DashboardQuanLy() {
  const [presentEmployees, setPresentEmployees] = useState([]);
  const [absentEmployees, setAbsentEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  // Lấy ngày hiện tại
  const today = new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  
  const fetchData = () => {
    // PRESENT
    fetch("http://localhost:5000/api/manager/dashboard/present")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP Error! Status: ${res.status}`); // Ném lỗi nếu HTTP status không phải 2xx
        }
        // Kiểm tra xem content-type có phải là JSON không trước khi parse
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new TypeError("Oops, API không trả về JSON!");
        }
        return res.json();
      })
      .then((data) => {
        const mapped = data.map((emp) => ({
          name: emp.full_name,
          phone: emp.phone_number,
          time: emp.check_in_time?.slice(11, 16),
          lat: emp.check_in_latitude,
          lng: emp.check_in_longitude,
          location: emp.location_name || "Không rõ",
          status: emp.check_in_time?.slice(11, 16) <= "08:00" ? "on_time" : "late",
        }));
        setPresentEmployees(mapped);
      })
      .catch((err) => {
        console.error("Lỗi tải data hiện diện:", err.message);
        setPresentEmployees([]); // Set mảng rỗng để UI không bị lỗi undefined
      });

    // ABSENT
    fetch("http://localhost:5000/api/manager/dashboard/absent")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP Error! Status: ${res.status}`);
        
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new TypeError("Oops, API không trả về JSON!");
        }
        return res.json();
      })
      .then((data) => {
        const mapped = data.map((emp) => ({
          name: emp.full_name,
          phone: emp.phone_number,
          status: emp.leave_status === "approved" ? "leave" : "absent",
        }));
        setAbsentEmployees(mapped);
      })
      .catch((err) => {
        console.error("Lỗi tải data vắng mặt:", err.message);
        setAbsentEmployees([]); // Set mảng rỗng để UI không bị lỗi undefined
      });
  };

  // LOAD LẦN ĐẦU
  useEffect(() => {
    fetchData();
  }, []);

  // 📊 STATS
  const total = presentEmployees.length + absentEmployees.length;
  const present = presentEmployees.length;
  const absent = absentEmployees.length;
  const performance = total === 0 ? 0 : Math.round((present / total) * 100);

  const getPerformanceColor = () => {
    if (performance >= 90) return "from-emerald-400 to-emerald-600";
    if (performance >= 70) return "from-blue-400 to-blue-600";
    if (performance >= 50) return "from-amber-400 to-amber-500";
    return "from-rose-400 to-rose-600";
  };

  return (
    <div className="space-y-8 p-6 bg-slate-50 min-h-screen font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Tổng quan Bộ phận
          </h1>
          <p className="text-slate-500 flex items-center gap-2 mt-1 text-sm">
            <Calendar size={16} /> Hôm nay: {today}
          </p>
        </div>

        <button
          onClick={() => {
            setLoading(true);
            fetchData();
            setTimeout(() => setLoading(false), 800);
          }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg shadow-sm hover:shadow transition-all font-medium text-sm"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          Cập nhật dữ liệu
        </button>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        
        {/* Card Tổng nhân sự */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:-translate-y-1 transition-transform duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">Tổng nhân sự</p>
              <h2 className="text-3xl font-extrabold text-slate-800">{total}</h2>
            </div>
            <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center">
              <Users className="text-indigo-600" size={24} />
            </div>
          </div>
        </div>

        {/* Card Hiện diện */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:-translate-y-1 transition-transform duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">Đã có mặt</p>
              <h2 className="text-3xl font-extrabold text-emerald-600">{present}</h2>
            </div>
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
              <UserCheck className="text-emerald-600" size={24} />
            </div>
          </div>
        </div>

        {/* Card Vắng mặt */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:-translate-y-1 transition-transform duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">Vắng mặt / Chưa tới</p>
              <h2 className="text-3xl font-extrabold text-rose-600">{absent}</h2>
            </div>
            <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center">
              <UserX className="text-rose-600" size={24} />
            </div>
          </div>
        </div>

        {/* Card Hiệu suất */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center hover:-translate-y-1 transition-transform duration-300">
          <div className="flex justify-between items-end mb-2">
            <p className="text-slate-500 text-sm font-medium">Tỷ lệ đi làm</p>
            <h2 className="text-2xl font-extrabold text-slate-800">{performance}%</h2>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div
              className={`bg-gradient-to-r ${getPerformanceColor()} h-full rounded-full transition-all duration-1000 ease-out`}
              style={{ width: `${performance}%` }}
            />
          </div>
        </div>

      </div>

      {/* DETAILED LISTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* LIST 1: PRESENT */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[450px]">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center sticky top-0">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Nhân sự đã Check-in
            </h2>
            <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">
              {present} người
            </span>
          </div>

          <div className="p-4 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
            {presentEmployees.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <AlertCircle size={32} className="mb-2 opacity-50" />
                <p className="text-sm">Chưa có ai check-in hôm nay</p>
              </div>
            ) : (
              presentEmployees.map((emp, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-3.5 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center font-bold text-indigo-700 shadow-sm">
                      {emp.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{emp.name}</p>
                      <button
                        className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 group-hover:text-indigo-600 transition-colors"
                        onClick={() =>
                          window.open(
                            `https://maps.google.com/?q=${emp.lat},${emp.lng}`,
                            "_blank"
                          )
                        }
                      >
                        <MapPin size={12} /> {emp.location}
                      </button>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-700 mb-1">{emp.time}</p>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center justify-center gap-1 inline-flex
                        ${
                          emp.status === "on_time"
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                            : "bg-amber-50 text-amber-600 border border-amber-100"
                        }`}
                    >
                      {emp.status === "on_time" ? "Đúng giờ" : "Đi muộn"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* LIST 2: ABSENT */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[450px]">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center sticky top-0">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              Chưa có tín hiệu
            </h2>
            <span className="text-xs font-semibold bg-rose-100 text-rose-700 px-2.5 py-1 rounded-full">
              {absent} người
            </span>
          </div>

          <div className="p-4 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
            {absentEmployees.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <UserCheck size={32} className="mb-2 opacity-50 text-emerald-500" />
                <p className="text-sm">Tuyệt vời! 100% nhân sự đã có mặt.</p>
              </div>
            ) : (
              absentEmployees.map((emp, index) => {
                const isLeave = emp.status === "leave";

                return (
                  <div
                    key={index}
                    className={`flex justify-between items-center p-3.5 border rounded-xl transition-colors
                      ${
                        isLeave
                          ? "border-blue-100 bg-blue-50/50 hover:bg-blue-50"
                          : "border-rose-100 bg-rose-50/30 hover:bg-rose-50"
                      }
                    `}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-sm
                          ${
                            isLeave
                              ? "bg-blue-100 text-blue-700"
                              : "bg-rose-100 text-rose-700"
                          }`}
                      >
                        {emp.name?.charAt(0)}
                      </div>

                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{emp.name}</p>
                        <span
                          className={`text-[11px] font-medium mt-0.5 inline-block
                            ${isLeave ? "text-blue-600" : "text-rose-500"}`}
                        >
                          {isLeave ? "Đã duyệt nghỉ phép" : "Vắng mặt / Đi trễ"}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {/* PHONE BTN */}
                      <div className="relative group">
                        <button className="p-2 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 rounded-lg transition-colors">
                          <Phone size={16} />
                        </button>
                        {/* Tooltip Phone */}
                        <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block bg-slate-800 text-white text-xs px-3 py-1.5 rounded shadow-lg whitespace-nowrap z-10">
                          {emp.phone || "Chưa cập nhật SĐT"}
                          <div className="absolute top-full right-3 w-2 h-2 bg-slate-800 transform rotate-45 -mt-1"></div>
                        </div>
                      </div>

                      {/* NOTI BTN */}
                      <button
                        onClick={() => alert(`Đã mở popup gửi nhắc nhở cho ${emp.name}`)}
                        title="Gửi nhắc nhở"
                        className="p-2 bg-white border border-slate-200 text-slate-600 hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50 rounded-lg transition-colors"
                      >
                        <Bell size={16} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}