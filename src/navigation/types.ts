export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  SignupEmail: undefined;
  EmailOtpVerify: {
    email: string;
    name: string;
  };
  SignupEmailPassword: {
    email: string;
    name: string;
    signupToken?: string;
  };
  SignupPhone: undefined;
  OtpVerify: {
    phone: string;
    name: string;
  };
  SignupPhonePassword: {
    phone: string;
    name: string;
    signupToken?: string;
  };
  ForgotPassword: undefined;
  ForgotPasswordOtp: {
    identifier: string;
  };
  ResetPassword: {
    identifier: string;
    resetToken: string;
  };
};

export type MainStackParamList = {
  Home: undefined;
  Chat: undefined;
  VoiceCall: undefined;
  VideoCall: undefined;
  Profile: undefined;
};
