import { Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { ActivityLog } from '../entities/ActivityLog';
import { User, UserRole } from '../entities/User';
import { Student } from '../entities/Student';
import { Employee } from '../entities/Employee';
import { AuthenticatedRequest } from './auth';

const SENSITIVE_KEYS = new Set([
  'password', 'newPassword', 'oldPassword', 'token', 'accessToken', 'refreshToken', 'secret'
]);

const scrubObject = (obj: unknown): unknown => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return (obj as unknown[]).map(scrubObject);
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key)) {
      result[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      result[key] = scrubObject(value);
    } else {
      result[key] = value;
    }
  }
  return result;
};

export const activityLogMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const methodsToLog = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
  const shouldLog = methodsToLog.has(req.method);

  if (!shouldLog) return next();

  res.on('finish', async () => {
    try {
      const statusCode = res.statusCode;
      const repo = AppDataSource.getRepository(ActivityLog);
      const userRepo = AppDataSource.isInitialized ? AppDataSource.getRepository(User) : null;
      const paramsPayload = scrubObject({ params: req.params, query: req.query, body: req.body });

      let derivedUserId: string = (req.user?.id as string) || 'anonymous';
      let derivedRole: UserRole = (req.user?.role as UserRole) || UserRole.STAFF;

      if (derivedUserId === 'anonymous' && userRepo && req.method === 'POST') {
        const url = req.originalUrl || req.path;
        // Try to resolve user from login/register payload for better traceability
        if (url.includes('/api/auth/login') && req.body && typeof req.body.login === 'string') {
          const loginVal = (req.body.login as string).trim();
          const loginType = req.body.loginType as
            | 'AUTO'
            | 'EMAIL_OR_USERNAME'
            | 'STUDENT_ID'
            | 'EMPLOYEE_ID'
            | undefined;
          let user: User | null = null;
          try {
            if (loginType === 'STUDENT_ID') {
              const studentRepo = AppDataSource.getRepository(Student);
              const student = await studentRepo.findOne({ where: { studentId: loginVal }, relations: ['user'] });
              user = student?.user ?? null;
            } else if (loginType === 'EMPLOYEE_ID') {
              const employeeRepo = AppDataSource.getRepository(Employee);
              const employee = await employeeRepo.findOne({ where: { employeeId: loginVal }, relations: ['user'] });
              user = employee?.user ?? null;
            } else if (loginType === 'EMAIL_OR_USERNAME') {
              if (loginVal.includes('@')) {
                user = await userRepo.findOne({ where: { email: loginVal } });
              } else {
                user = await userRepo.findOne({ where: { username: loginVal } });
              }
            } else {
              if (loginVal.includes('@')) {
                user = await userRepo.findOne({ where: { email: loginVal } });
              } else {
                user = await userRepo.findOne({ where: { username: loginVal } });
                if (!user) {
                  const studentRepo = AppDataSource.getRepository(Student);
                  const student = await studentRepo.findOne({ where: { studentId: loginVal }, relations: ['user'] });
                  user = student?.user ?? null;
                }
                if (!user) {
                  const employeeRepo = AppDataSource.getRepository(Employee);
                  const employee = await employeeRepo.findOne({ where: { employeeId: loginVal }, relations: ['user'] });
                  user = employee?.user ?? null;
                }
              }
            }
          } catch (_e) { void _e; }
          if (user) {
            derivedUserId = user.id;
            derivedRole = user.role;
          } else {
            // Fallback for visibility: store the attempted login identifier
            derivedUserId = loginVal;
          }
        } else if (url.includes('/api/auth/register') && req.body && typeof req.body.email === 'string') {
          const emailVal = req.body.email as string;
          try {
            const user = await userRepo.findOne({ where: { email: emailVal } });
            if (user) {
              derivedUserId = user.id;
              derivedRole = user.role;
            }
          } catch (_e) { void _e; }
        }
      }

      // Dweezil's Code
      const record = repo.create({
        userId: derivedUserId,
        role: derivedRole,
        action: `${req.method} ${req.path}`,
        method: req.method,
        endpoint: req.originalUrl,
        params: JSON.stringify(paramsPayload),
        statusCode,
        ip: req.ip,
        userAgent: (req.headers['user-agent'] as string) || '',
        // Explicitly set createdAt to current UTC time to ensure consistency
        createdAt: new Date()
      });

      await repo.save(record);
    } catch (_err) {
      void _err;
      // Do not block response flow due to logging errors
      // Optional: console.error('Activity logging failed', err);
    }
  });

  next();
};
