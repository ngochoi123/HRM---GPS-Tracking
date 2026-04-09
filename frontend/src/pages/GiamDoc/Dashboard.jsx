import React, { useState, useEffect } from "react";
import { Users, Wallet, AlertCircle, RefreshCw } from "lucide-react";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import { directorDashboardService } from "../../services/directorDashboardService";
export default function Dashboard() {
  const [data, setData] = useState({
    summary: { total: 0, present: 0, salary: 0, requests: 0 },
    departments: [],
    managers: [],
    requests: []
  });
  const [loading, setLoading] = useState(true);

  // 👉 HÀM LẤY DỮ LIỆU TỪ BACKEND
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await directorDashboardService.getOverview();
      if (response?.success) {
        setData(response.data);
      }
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const { summary, departments, managers, requests } = data;
  const performance = summary?.total > 0 ? Math.round((summary?.present / summary?.total) * 100) : 0;

  const statusMap = {
    on_time: "Có mặt",
    late: "Đi trễ",
    early_leave: "Về sớm",
    absent: "Vắng"
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 bg-[#eef2f1] min-h-screen space-y-6"
    >
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          onClick={fetchDashboardData}
          disabled={loading}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg shadow-sm hover:shadow transition-all font-medium text-sm disabled:opacity-70"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          {loading ? "Đang cập nhật..." : "Cập nhật dữ liệu"}
        </motion.button>
      </div>

      {/* CARDS */}
      <motion.div
        className="grid grid-cols-4 gap-5"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.1 } }
        }}
      >
        <Card title="Tổng nhân sự" value={summary.total} icon={<Users size={18}/>}/>

        <Card
          title="Hiện diện hôm nay"
          value={`${performance}%`}
          sub={`${summary.present} có mặt / ${summary.total}`}
          green
        />

        <Card
          title="Quỹ lương ước tính"
          value={`${(summary.salary / 1_000_000).toLocaleString('vi-VN')} Tr`}
          icon={<Wallet size={18}/>}
        />

        <Card
          title="Cần phê duyệt"
          value={summary.requests}
          red
          icon={<AlertCircle size={18}/>}
        />
      </motion.div>

      {/* MAIN */}
      <div className="grid grid-cols-3 gap-6">
        {/* DEPARTMENTS */}
        <div className="col-span-2 bg-white p-6 rounded-2xl shadow-sm">
          <h2 className="font-semibold mb-4">Tình hình chấm công theo Phòng ban (Hôm nay)</h2>

          {departments.length === 0 && <p className="text-sm text-gray-400">Chưa có dữ liệu chấm công hôm nay.</p>}

          {departments.map((d, i) => {
            const green = d.total > 0 ? Math.round((d.on_time / d.total) * 100) : 0;
            const yellow = d.total > 0 ? Math.round((d.late / d.total) * 100) : 0;
            const blue = d.total > 0 ? Math.round((d.early_leave / d.total) * 100) : 0;
            const gray = 100 - green - yellow - blue;

            return (
              <motion.div key={i} className="mb-5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">{d.name} <span className="text-gray-400 text-xs">({d.total} NV)</span></span>
                  <span className="text-green-600 font-semibold">{green}% đúng giờ</span>
                </div>
                <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
                  <motion.div className="bg-green-500" initial={{ width: 0 }} animate={{ width: `${green}%` }} transition={{ duration: 1 }} />
                  <motion.div className="bg-yellow-400" initial={{ width: 0 }} animate={{ width: `${yellow}%` }} transition={{ duration: 1 }} />
                  <motion.div className="bg-blue-400" initial={{ width: 0 }} animate={{ width: `${blue}%` }} transition={{ duration: 1 }} />
                  <motion.div className="bg-gray-300" initial={{ width: 0 }} animate={{ width: `${gray}%` }} transition={{ duration: 1 }} />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* MANAGERS */}
        <div className="bg-white p-6 rounded-2xl shadow-sm">
          <h2 className="font-semibold mb-4">Trạng thái Trưởng phòng</h2>
          {managers.length === 0 && <p className="text-sm text-gray-400">Chưa có thông tin.</p>}
          {managers.map((m, i) => (
            <motion.div key={i} className="flex items-center justify-between mb-4" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500">
                  {m.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-sm">{m.name}</p>
                  <p className="text-xs text-gray-400">{m.dept}</p>
                </div>
              </div>
              <StatusBadge status={m.status || 'absent'} label={statusMap[m.status || 'absent']} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* REQUESTS */}
      <div className="bg-white p-6 rounded-2xl shadow-sm">
        <h2 className="font-semibold mb-4">Yêu cầu cần xử lý mới nhất</h2>
        {requests.length === 0 ? (
           <p className="text-sm text-gray-400">Không có yêu cầu nào đang chờ duyệt.</p>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {requests.map((r, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="p-4 border rounded-xl flex items-center gap-3 hover:shadow-md transition cursor-pointer">
                <div className={`p-2 rounded-lg ${r.type === 'leave' ? 'bg-orange-100' : 'bg-blue-100'}`}>
                  <AlertCircle size={18} className={r.type === 'leave' ? 'text-orange-500' : 'text-blue-500'}/>
                </div>
                <div>
                  <p className="font-medium text-sm truncate w-32">{r.name}</p>
                  <p className="text-xs text-gray-500">
                    {r.type === "leave" ? "Nghỉ phép" : "Tăng ca"}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Giữ nguyên Card và StatusBadge như cũ của bạn
function Card({ title, value, sub, green, red, icon }) {
  return (
    <motion.div variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } }} whileHover={{ scale: 1.05 }} transition={{ type: "spring", stiffness: 120 }} className={`p-5 rounded-2xl shadow-sm flex justify-between items-start ${red ? "bg-gradient-to-r from-red-500 to-pink-500 text-white" : "bg-white"}`}>
      <div>
        <p className="text-sm opacity-70">{title}</p>
        <h2 className={`text-2xl font-bold ${green ? "text-green-600" : ""}`}>{value}</h2>
        {sub && <p className="text-xs opacity-70">{sub}</p>}
      </div>
      <div className={`p-2 rounded-lg ${red ? "bg-white/20" : "bg-gray-100"}`}>{icon}</div>
    </motion.div>
  );
}

function StatusBadge({ status, label }) {
  const map = {
    on_time: "bg-green-100 text-green-600",
    late: "bg-yellow-100 text-yellow-600",
    early_leave: "bg-blue-100 text-blue-600",
    absent: "bg-gray-200 text-gray-500"
  };
  return <span className={`text-xs px-3 py-1 rounded-full font-medium ${map[status]}`}>{label}</span>;
}