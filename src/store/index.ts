import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';
import studentReducer from './slices/studentSlice';
import courseReducer from './slices/courseSlice';
import subjectReducer from './slices/subjectSlice';
import departmentReducer from './slices/departmentSlice';
import courseSectionReducer from './slices/courseSectionSlice';
import enrollmentReducer from './slices/enrollmentSlice';
import paymentReducer from './slices/paymentSlice';
import libraryReducer from './slices/librarySlice';
import schedulingReducer from './slices/schedulingSlice';
import employeeReducer from './slices/employeeSlice';
import feeReducer from './slices/feeSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
    student: studentReducer,
    course: courseReducer,
    subjects: subjectReducer,
    department: departmentReducer,
    courseSection: courseSectionReducer,
    enrollment: enrollmentReducer,
    payment: paymentReducer,
    library: libraryReducer,
    scheduling: schedulingReducer,
    employee: employeeReducer,
    fee: feeReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;