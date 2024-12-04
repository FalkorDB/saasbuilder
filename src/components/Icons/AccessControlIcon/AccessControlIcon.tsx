import { FC } from "react";
import { styleConfig } from "src/providerConfig";

type AccessControlIconProps = {
  color?: string;
};

const AccessControlIcon: FC<AccessControlIconProps> = ({
  color = styleConfig.headerIconColor,
  ...otherProps
}) => {
  return (
    <svg
      width="38"
      height="38"
      viewBox="0 0 38 38"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...otherProps}
    >
      <path
        d="M31.6667 15.8333V10.7667C31.6667 8.10641 31.6667 6.77629 31.1489 5.76021C30.6935 4.86644 29.9669 4.13978 29.0731 3.68438C28.057 3.16666 26.7269 3.16666 24.0667 3.16666H13.9333C11.2731 3.16666 9.94296 3.16666 8.92688 3.68438C8.03311 4.13978 7.30645 4.86644 6.85105 5.76021C6.33333 6.77629 6.33333 8.10641 6.33333 10.7667V27.2333C6.33333 29.8936 6.33333 31.2237 6.85105 32.2398C7.30645 33.1336 8.03311 33.8602 8.92688 34.3156C9.94296 34.8333 11.2731 34.8333 13.9333 34.8333H16.625M20.5833 17.4167H12.6667M17.4167 23.75H12.6667M25.3333 11.0833H12.6667M30.4792 26.9167V24.1458C30.4792 22.6155 29.2386 21.375 27.7083 21.375C26.178 21.375 24.9375 22.6155 24.9375 24.1458V26.9167M24.7 33.25H30.7167C31.6034 33.25 32.0468 33.25 32.3855 33.0774C32.6834 32.9256 32.9256 32.6834 33.0774 32.3855C33.25 32.0468 33.25 31.6034 33.25 30.7167V29.45C33.25 28.5632 33.25 28.1199 33.0774 27.7812C32.9256 27.4833 32.6834 27.241 32.3855 27.0892C32.0468 26.9167 31.6034 26.9167 30.7167 26.9167H24.7C23.8132 26.9167 23.3699 26.9167 23.0312 27.0892C22.7333 27.241 22.491 27.4833 22.3392 27.7812C22.1667 28.1199 22.1667 28.5632 22.1667 29.45V30.7167C22.1667 31.6034 22.1667 32.0468 22.3392 32.3855C22.491 32.6834 22.7333 32.9256 23.0312 33.0774C23.3699 33.25 23.8132 33.25 24.7 33.25Z"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default AccessControlIcon;
