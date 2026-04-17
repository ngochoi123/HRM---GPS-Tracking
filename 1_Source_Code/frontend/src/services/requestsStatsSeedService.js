export const SQL_SEED_MANAGER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
export const SQL_SEED_MANAGER_USERNAME = 'manager@gmail.com';
export const SQL_SEED_ACTIVE_MONTH = '2026-03';

const activeMonthData = {
  month: SQL_SEED_ACTIVE_MONTH,
  summary: {
    totalCurrent: 1,
    totalPrevious: 0,
    pendingCurrent: 0,
    pendingPrevious: 0,
    approvedCurrent: 1,
    approvedPrevious: 0,
    rejectedCurrent: 0,
    rejectedPrevious: 0,
    overduePendingCurrent: 0,
    approvalRateCurrent: 100,
    approvalRatePrevious: 0,
    averageWaitHoursCurrent: 0,
    averageWaitHoursPrevious: 0
  },
  breakdown: [
    {
      key: 'annual',
      total: 1
    }
  ],
  pendingRequests: [],
  monthlyRequests: [
    {
      id: 'a61243b2-f724-4f12-8c0a-299b716e1b17',
      type: 'leave',
      subtype: 'annual',
      status: 'approved',
      createdAt: '2026-03-19T01:39:12.006Z',
      requestDate: '2026-03-19T17:00:00.000Z',
      reason: 'Xin nghỉ về quê',
      employeeId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      employeeCode: 'EMP-003',
      employeeName: 'Lê Lập Trình Viên',
      approverName: 'Trần Thị Quản Lý',
      positionName: 'Lập trình viên Backend',
      departmentName: 'Phòng Công nghệ Thông tin',
      canApprove: false,
      waitingHours: 0,
      isOverdue: false
    }
  ]
};

const emptySummary = {
  totalCurrent: 0,
  totalPrevious: 0,
  pendingCurrent: 0,
  pendingPrevious: 0,
  approvedCurrent: 0,
  approvedPrevious: 0,
  rejectedCurrent: 0,
  rejectedPrevious: 0,
  overduePendingCurrent: 0,
  approvalRateCurrent: 0,
  approvalRatePrevious: 0,
  averageWaitHoursCurrent: 0,
  averageWaitHoursPrevious: 0
};

export const buildSeedRequestsStats = (month) => {
  const targetMonth = month || SQL_SEED_ACTIVE_MONTH;
  const payload =
    targetMonth === SQL_SEED_ACTIVE_MONTH
      ? activeMonthData
      : {
          month: targetMonth,
          summary: { ...emptySummary },
          breakdown: [],
          pendingRequests: [],
          monthlyRequests: []
        };

  return {
    ...payload,
    summary: { ...payload.summary },
    breakdown: [...payload.breakdown],
    pendingRequests: [...payload.pendingRequests],
    monthlyRequests: [...payload.monthlyRequests],
    meta: {
      source: 'dataKhang.sql',
      seededManagerId: SQL_SEED_MANAGER_ID,
      seededManagerUsername: SQL_SEED_MANAGER_USERNAME,
      activeMonth: SQL_SEED_ACTIVE_MONTH
    }
  };
};
