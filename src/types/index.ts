export type Employee = {
  id: string;
  name: string;
  title: string;
  region: 'HYD' | 'EMEA' | 'NAM' | 'Central';
  manager: string;
  team: string;
};

export type Account = {
  id: string;
  name: string;
};

export type Allocation = {
  employeeId: string;
  allocations: { accountId: string; fte: number }[];
};

export type Activity = {
  id: string;
  user: string;
  avatar: string;
  action: string;
  target: string;
  time: string;
};
