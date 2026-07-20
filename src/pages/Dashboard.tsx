import React from 'react';
import DashboardRouter from '../components/DashboardRouter';

/**
 * Main Dashboard Page Component
 * 
 * This component serves as the entry point for all role-based dashboards.
 * It uses the DashboardRouter to automatically route users to their
 * appropriate dashboard based on their role.
 */
const Dashboard: React.FC = () => {
  return <DashboardRouter />;
};

export default Dashboard;