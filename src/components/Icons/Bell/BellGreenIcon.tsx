import { FC } from "react";
import { styleConfig } from "src/providerConfig";

type BellIconProps = {
  color?: string;
};

const BellGreenIcon: FC<BellIconProps> = ({
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
        d="M22.1667 33.25H15.8333M28.5 12.6667C28.5 10.1471 27.4991 7.73074 25.7175 5.94914C23.9359 4.16755 21.5196 3.16666 19 3.16666C16.4805 3.16666 14.0641 4.16755 12.2825 5.94914C10.5009 7.73074 9.50001 10.1471 9.50001 12.6667C9.50001 17.5594 8.26575 20.9094 6.88698 23.1252C5.72396 24.9943 5.14245 25.9288 5.16377 26.1895C5.18738 26.4782 5.24854 26.5883 5.48115 26.7608C5.69124 26.9167 6.63828 26.9167 8.53236 26.9167H29.4677C31.3617 26.9167 32.3088 26.9167 32.5189 26.7608C32.7515 26.5883 32.8126 26.4782 32.8362 26.1895C32.8576 25.9288 32.2761 24.9943 31.113 23.1252C29.7343 20.9094 28.5 17.5595 28.5 12.6667Z"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default BellGreenIcon;
