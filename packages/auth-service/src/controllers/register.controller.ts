import { emailQueue } from '@/jobs/queue/email.queue';
import { createUserServiceClient } from '@/services/clients/user.service';
import { catchAsync } from '@/utils/catchAsync';
import { generateResetToken } from '@/utils/jwt';
import { RegisterSchemaType } from '@/validators';
import { getAuditFields } from '@/utils/audit.util';

export const registerHandler = catchAsync(async (c) => {
  const {
    email,
    password,
    address,
    dateOfBirth,
    fullName,
    phoneNumber,
    roleId,
    isActive,
    domainId,
    driverCapacity,
  }: RegisterSchemaType = await c.get('validatedData').body;

  const audit = getAuditFields(c);

  const [firstName, lastName] = fullName?.split(' ') || ['', ''];
  const { password: _removedPassword, ...result } = await createUserServiceClient({
    email,
    password,
    roleId,
    isActive: isActive ?? true,
    address: address?.trim() ?? '',
    phoneNumber: phoneNumber?.trim() ?? '',
    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : new Date(),
    firstName,
    lastName,
    domainId: domainId ?? '',
    createdBy: audit.createdBy,
    updatedAt: new Date(),
    driverCapacity: Number(driverCapacity) ?? 0,
  });

  const resetToken = await generateResetToken({ email, id: result.id });
  const resetLink = `${process.env.FRONTEND_URL}/auth/reset-password/${resetToken}`;

  await emailQueue.add(
    'send-email',
    {
      type: 'forgot-password',
      to: email,
      data: { resetLink },
    },
    { jobId: `email:forgot-password:${email}` }
  );

  return c.json({ data: result });
});