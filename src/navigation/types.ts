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
};

export type MainStackParamList = {
  Home: undefined;
  Chat: undefined;
  Voice: undefined;
};
