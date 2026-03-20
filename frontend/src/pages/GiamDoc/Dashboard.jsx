import React from "react";
import {
  RefreshCw,
  Users,
  UserCheck,
  UserX
} from "lucide-react";

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">
          Bảng điều khiển Nhóm - IT
        </h1>
        <button className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl shadow">
          <RefreshCw size={16} />
          Làm mới
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-2xl shadow flex items-center justify-between">
          <div>
            <p className="text-gray-500">Tổng nhân sự</p>
            <h2 className="text-3xl font-bold">25</h2>
          </div>
          <Users className="text-blue-500" />
        </div>

        <div className="bg-green-100 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-green-700">Hiện diện</p>
            <h2 className="text-3xl font-bold">22</h2>
          </div>
          <UserCheck className="text-green-600" />
        </div>

        <div className="bg-red-100 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-red-700">Vắng mặt</p>
            <h2 className="text-3xl font-bold">03</h2>
          </div>
          <UserX className="text-red-600" />
        </div>

        <div className="bg-white p-5 rounded-2xl shadow">
          <p className="text-gray-500">Hiệu suất</p>
          <h2 className="text-3xl font-bold mt-2">88%</h2>
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-2xl shadow">
          <h2 className="font-semibold mb-4">Nhân viên hiện diện</h2>
          <ul className="space-y-3">
            <li className="flex justify-between">
              <span>Chu Tuấn Dũng</span>
              <span className="text-green-500 font-medium">07:52</span>
            </li>
            <li className="flex justify-between">
              <span>Lê Thu Hà</span>
              <span className="text-green-500 font-medium">08:02</span>
            </li>
          </ul>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow">
          <h2 className="font-semibold mb-4">Nhân viên vắng mặt</h2>
          <ul className="space-y-3 text-red-500">
            <li className="flex justify-between">
              <span>Lê Văn Hùng</span>
              <span>Chưa check-in</span>
            </li>
            <li className="flex justify-between">
              <span>Phan Quốc Tuấn</span>
              <span>Chưa check-in</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}