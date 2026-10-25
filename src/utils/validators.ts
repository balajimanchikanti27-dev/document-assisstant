import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Email address is required').email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    fullName: z
      .string()
      .min(1, 'Full name is required')
      .min(2, 'Name must be at least 2 characters'),
    email: z.string().min(1, 'Email address is required').email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .regex(/[A-Za-z]/, 'Password must contain at least one letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    termsAccepted: z.literal(true, {
      errorMap: () => ({ message: 'You must accept the Terms of Service and Privacy Policy' }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type SignupFormData = z.infer<typeof signupSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email address is required').email('Please enter a valid email address'),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const phoneSchema = z.object({
  countryCode: z.string().min(1, 'Country code required'),
  phoneNumber: z
    .string()
    .min(1, 'Phone number is required')
    .regex(/^[0-9\s-]{7,15}$/, 'Please enter a valid phone number (digits only)'),
});

export type PhoneFormData = z.infer<typeof phoneSchema>;

export const otpSchema = z.object({
  otp: z
    .string()
    .length(6, 'Please enter a complete 6-digit verification code')
    .regex(/^\d{6}$/, 'Code must contain numbers only'),
});

export type OtpFormData = z.infer<typeof otpSchema>;
