import { FC } from "react";
import { Metadata } from "next";

import { checkReCaptchaSetup, getReCaptchaSiteKey } from "src/server/utils/checkReCaptchaSetup";

import ResetPasswordPage from "./components/ResetPasswordPage";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Reset your password",
};

const Page: FC = () => {
  return (
    <ResetPasswordPage
      googleReCaptchaSiteKey={getReCaptchaSiteKey()}
      isReCaptchaSetup={checkReCaptchaSetup()}
    />
  );
};

export default Page;
